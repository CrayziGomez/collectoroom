
'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import type { Collection, Card } from '@/lib/types';


export async function toggleFollow(input: { targetUserId: string, currentUserId: string }) {
    const { targetUserId, currentUserId } = input;

    if (currentUserId === targetUserId) {
      throw new Error('Users cannot follow themselves.');
    }

    try {
      const newState = await adminDb.runTransaction(async (transaction) => {
        const currentUserRef = adminDb.collection('users').doc(currentUserId);
        const targetUserRef = adminDb.collection('users').doc(targetUserId);
        const followingRef = currentUserRef.collection('following').doc(targetUserId);
        const followerRef = targetUserRef.collection('followers').doc(currentUserId);
        
        const followingSnap = await transaction.get(followingRef);
        const currentUserSnap = await transaction.get(currentUserRef);

        if (!currentUserSnap.exists) {
            throw new Error('Current user does not exist.');
        }
        
        const currentUserData = currentUserSnap.data();
        const isCurrentlyFollowing = followingSnap.exists;
        
        let finalState: 'followed' | 'unfollowed';

        if (isCurrentlyFollowing) {
          // --- Unfollow Logic ---
          transaction.delete(followingRef);
          transaction.delete(followerRef);
          
          transaction.update(currentUserRef, { followingCount: FieldValue.increment(-1) });
          transaction.update(targetUserRef, { followerCount: FieldValue.increment(-1) });
          
          finalState = 'unfollowed';
        } else {
          // --- Follow Logic ---
          transaction.set(followingRef, { timestamp: FieldValue.serverTimestamp() });
          transaction.set(followerRef, { timestamp: FieldValue.serverTimestamp() });

          transaction.update(currentUserRef, { followingCount: FieldValue.increment(1) });
          transaction.update(targetUserRef, { followerCount: FieldValue.increment(1) });
          
          // --- Notification Logic ---
          const notificationRef = adminDb.collection('notifications').doc();
          transaction.set(notificationRef, {
            recipientId: targetUserId,
            senderId: currentUserId,
            senderName: currentUserData?.username || 'Someone',
            type: 'NEW_FOLLOWER',
            message: `${currentUserData?.username || 'Someone'} started following you.`,
            link: `/my-collectoroom/connections`,
            isRead: false,
            timestamp: FieldValue.serverTimestamp(),
          });
          
          finalState = 'followed';
        }
        
        return finalState;
      });

      return { newState };
    } catch (error: any) {
      console.error('Transaction failed:', error);
      throw new Error(`Failed to toggle follow state: ${error.message}`);
    }
}


export async function updateAvatar(formData: FormData) {
    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;

    if (!userId || !file) {
        return { success: false, message: 'Missing userId or file.' };
    }
        
    try {
        const bucket = adminStorage.bucket();
        const userDocRef = adminDb.collection('users').doc(userId);

        const userDoc = await userDocRef.get();
        const userData = userDoc.data();
        if (userData?.avatarUrl) {
            try {
                 if (userData.avatarUrl.includes(bucket.name)) {
                    const oldUrl = new URL(userData.avatarUrl);
                    const oldPath = decodeURIComponent(oldUrl.pathname.substring(oldUrl.pathname.indexOf(bucket.name) + 1));
                    if (oldPath) {
                        await bucket.file(oldPath).delete({ ignoreNotFound: true });
                    }
                 }
            } catch (deleteError) {
                console.warn("Failed to delete old avatar, continuing...", deleteError);
            }
        }

        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `users/${userId}/profile/${fileName}`;
        const fileRef = bucket.file(filePath);
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        await fileRef.save(fileBuffer, { metadata: { contentType: file.type } });
        
        const [signedUrl] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '01-01-2100',
        });
        
        await userDocRef.update({
            avatarUrl: signedUrl,
        });

        revalidatePath('/my-collectoroom/settings');
        revalidatePath('/my-collectoroom');

        return { success: true, avatarUrl: signedUrl, message: `Avatar updated successfully (URL: ${signedUrl})` };
    } catch (error: any) {
        console.error('Error updating avatar:', error);
        const errorMessage = error.message || 'An unknown error occurred during avatar upload.';
        const errorCode = error.code || 'UNKNOWN';
        return { success: false, message: `Upload Failed: {"code":"${errorCode}","message":"${errorMessage}"}`, avatarUrl: null };
    }
}


export async function deleteUser(input: { userId: string }): Promise<{ success: boolean; message?: string }> {
    const { userId } = input;
    console.log(`--- Starting deletion process for user: ${userId} ---`);

    try {
        const bucket = adminStorage.bucket();
        const batch = adminDb.batch();

        const collectionsQuery = adminDb.collection('collections').where('userId', '==', userId);
        const collectionsSnapshot = await collectionsQuery.get();
        console.log(`Found ${collectionsSnapshot.size} collection(s) for user ${userId}.`);

        for (const collectionDoc of collectionsSnapshot.docs) {
            console.log(`Processing collection: ${collectionDoc.id}`);
            const cardsQuery = adminDb.collection('cards').where('collectionId', '==', collectionDoc.id);
            const cardsSnapshot = await cardsQuery.get();
            console.log(`Found ${cardsSnapshot.size} card(s) in collection ${collectionDoc.id}.`);

            for (const cardDoc of cardsSnapshot.docs) {
                console.log(`Processing card: ${cardDoc.id}`);
                const cardData = cardDoc.data() as Card;
                if (cardData.images && cardData.images.length > 0) {
                    console.log(`Found ${cardData.images.length} image(s) for card ${cardDoc.id}.`);
                    const deletePromises = cardData.images.map(image => {
                        console.log(`Deleting image from storage: ${image.path}`);
                        return bucket.file(image.path).delete({ ignoreNotFound: true });
                    });
                    await Promise.all(deletePromises);
                    console.log(`Finished deleting images for card ${cardDoc.id}.`);
                }
                batch.delete(cardDoc.ref);
                console.log(`Batched delete for card document: ${cardDoc.id}`);
            }
            batch.delete(collectionDoc.ref);
            console.log(`Batched delete for collection document: ${collectionDoc.id}`);
        }

        console.log(`Deleting profile picture folder for user: users/${userId}/profile/`);
        await bucket.deleteFiles({ prefix: `users/${userId}/profile/` });
        console.log('Profile picture folder deletion command issued.');
        
        const userRef = adminDb.collection('users').doc(userId);
        batch.delete(userRef);
        console.log(`Batched delete for user document: ${userId}`);

        await batch.commit();
        console.log('Firestore batch commit successful.');

        await adminAuth.deleteUser(userId);
        console.log(`Successfully deleted user from Firebase Authentication: ${userId}`);

        revalidatePath('/admin');
        console.log('--- Deletion process complete --- ');
        return { success: true, message: 'User and all associated data deleted.' };

    } catch (error: any) {
        console.error(`Failed to delete user ${userId}:`, error);
        console.log('--- Deletion process failed --- ');
        return {
            success: false,
            message: `An error occurred: ${error.message}. Check server logs for details.`
        };
    }
}
