
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export async function toggleFollow(input: { targetUserId: string, currentUserId: string }) {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized.');
    }
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
        
        const [currentUserSnap, followingSnap] = await Promise.all([
            transaction.get(currentUserRef),
            transaction.get(followingRef)
        ]);

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
        if (!adminStorage || !adminDb) {
          throw new Error('Firebase Admin SDK not initialized correctly.');
        }
        
        const bucketNameFromEnv = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketNameFromEnv) {
            throw new Error('Firebase Storage bucket name is not configured in environment variables.');
        }

        // --- CRITICAL FIX ---
        // The environment variable contains an incorrect ".appspot.com" suffix.
        // We strip it here to get the actual bucket name.
        const correctBucketName = bucketNameFromEnv.replace('.appspot.com', '');
        
        const bucket = adminStorage.bucket(correctBucketName);
        const userDocRef = adminDb.collection('users').doc(userId);

        // Delete old avatar if it exists
        const userDoc = await userDocRef.get();
        const userData = userDoc.data();
        if (userData?.avatarUrl) {
            try {
                 if (userData.avatarUrl.includes('storage.googleapis.com')) {
                    const oldUrl = new URL(userData.avatarUrl);
                    // Extract path after the bucket name
                    const oldPath = decodeURIComponent(oldUrl.pathname.split('/').slice(2).join('/'));
                    if (oldPath) {
                        await bucket.file(oldPath).delete({ ignoreNotFound: true });
                    }
                 }
            } catch (deleteError) {
                console.error("Failed to delete old avatar, continuing...", deleteError);
            }
        }

        // Upload new avatar
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `users/${userId}/profile/${fileName}`;
        const fileRef = bucket.file(filePath);
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        await fileRef.save(fileBuffer, { metadata: { contentType: file.type } });
        
        // Generate a long-lived signed URL
        const [signedUrl] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '01-01-2100', // Set a very distant expiration date
        });
        
        // Save the signed URL to Firestore
        await userDocRef.update({
            avatarUrl: signedUrl,
        });

        revalidatePath('/my-collectoroom/settings');
        revalidatePath('/my-collectoroom');

        return { success: true, avatarUrl: signedUrl, message: 'Avatar updated successfully' };
    } catch (error: any) {
        console.error('Error updating avatar:', error);
        // Stringify the error to get more details on the client side
        return { success: false, message: JSON.stringify(error), avatarUrl: null };
    }
}
