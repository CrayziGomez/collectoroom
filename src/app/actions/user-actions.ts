
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

// Self-contained Firebase Admin initialization
function initializeAdmin() {
  const alreadyCreated = getApps();
  if (alreadyCreated.length > 0) {
    const app = alreadyCreated[0];
    return { db: getFirestore(app), storage: getStorage(app) };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountString.trim());
  } catch (error: any) {
    const preview = serviceAccountString.substring(0, 20);
    throw new Error(`Failed to parse service account JSON. The string starts with: "${preview}". Full string length is ${serviceAccountString.length}. Please verify the secret's format in your hosting environment. Original error: ${error.message}`);
  }

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return { db: getFirestore(app), storage: getStorage(app) };
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

export async function toggleFollow(input: { targetUserId: string, currentUserId: string }) {
    const { db } = initializeAdmin();
    
    const { targetUserId, currentUserId } = input;

    if (currentUserId === targetUserId) {
      throw new Error('Users cannot follow themselves.');
    }

    try {
      const newState = await db.runTransaction(async (transaction) => {
        const currentUserRef = db.collection('users').doc(currentUserId);
        const targetUserRef = db.collection('users').doc(targetUserId);
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
          const notificationRef = db.collection('notifications').doc();
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
    const { db, storage } = initializeAdmin();

    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;

    if (!userId || !file) {
        return { success: false, message: 'Missing userId or file.' };
    }
        
    try {
        const bucket = storage.bucket();
        const userDocRef = db.collection('users').doc(userId);

        const userDoc = await userDocRef.get();
        const userData = userDoc.data();
        if (userData?.avatarUrl) {
            try {
                 if (userData.avatarUrl.includes(bucket.name)) {
                    const oldUrl = new URL(userData.avatarUrl);
                    const oldPath = decodeURIComponent(oldUrl.pathname.substring(oldUrl.pathname.indexOf(bucket.name) + bucket.name.length + 1));
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
