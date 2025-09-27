
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

    if (!adminStorage || !adminDb) {
      return { success: false, message: 'Firebase Admin SDK not initialized correctly.' };
    }

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
                 const oldUrl = new URL(userData.avatarUrl);
                 const oldPath = decodeURIComponent(oldUrl.pathname.substring(oldUrl.pathname.indexOf('/', 1) + 1));
                 if (oldPath) {
                     await bucket.file(oldPath).delete();
                 }
            } catch (deleteError) {
                console.error("Failed to delete old avatar, continuing...", deleteError);
            }
        }

        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `users/${userId}/profile/${fileName}`;
        const fileRef = bucket.file(filePath);
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        await fileRef.save(fileBuffer, { metadata: { contentType: file.type } });
        
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        await userDocRef.update({
            avatarUrl: publicUrl,
        });

        revalidatePath('/my-collectoroom/settings');
        revalidatePath('/my-collectoroom');

        return { success: true, avatarUrl: publicUrl, message: 'Avatar updated successfully' };
    } catch (error: any) {
        console.error('Error updating avatar:', error);
        return { success: false, message: error.message || 'Failed to update avatar.', avatarUrl: null };
    }
}
