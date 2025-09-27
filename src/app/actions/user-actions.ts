
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getStorage } from 'firebase-admin/storage';


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
    if (!adminDb) {
        return { success: false, message: 'Firebase Admin SDK not initialized.' };
    }
    
    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;
    const bucketName = 'studio-7145415565-66e7d.firebasestorage.app';

    if (!userId || !file) {
        return { success: false, message: 'Missing userId or file.' };
    }
    
    try {
        const storage = getStorage();
        const bucket = storage.bucket(bucketName);
        
        // 1. Get user doc to find old avatarUrl
        const userDocRef = adminDb.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        const userData = userDoc.data();
        const oldAvatarUrl = userData?.avatarUrl;

        // 2. Upload new file
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `users/${userId}/profile/${fileName}`;
        const fileRef = bucket.file(filePath);
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        await new Promise((resolve, reject) => {
            const stream = fileRef.createWriteStream({
                metadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
            });
            stream.on('finish', resolve);
            stream.on('error', reject);
            stream.end(fileBuffer);
        });
        
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        // 3. Delete old file if it exists and is a GCS URL
        if (oldAvatarUrl && oldAvatarUrl.startsWith('https://storage.googleapis.com/')) {
             try {
                // Extract the path from the URL
                const urlParts = oldAvatarUrl.split('/');
                const oldFilePath = urlParts.slice(4).join('/');
                
                if (oldFilePath) {
                     await bucket.file(oldFilePath).delete();
                }
             } catch(deleteError) {
                // Log the error but don't fail the whole operation
                // if the old file can't be deleted for some reason.
                console.error("Failed to delete old avatar:", deleteError);
             }
        }
        
        // 4. Update Firestore with new URL
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
