
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { revalidatePath } from 'next/cache';


let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;
let adminStorage: Storage;

function initializeAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
     try {
      const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
      }
      
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountString, 'base64').toString('utf8')
      );

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`,
      });

    } catch (e: any) {
      console.error('Firebase Admin SDK initialization failed.', e);
      throw new Error(`Firebase Admin SDK initialization failed: ${e.message}`);
    }
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
  adminStorage = getStorage(adminApp);
}


export async function toggleFollow(input: { targetUserId: string, currentUserId: string }) {
    const { targetUserId, currentUserId } = input;
    if (!adminApp) initializeAdmin();

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


export async function updateAvatar(input: { userId: string; file: File; }) {
    const { userId, file } = input;
    if (!adminApp) initializeAdmin();
    
    try {
        const filePath = `users/${userId}/profile/${Date.now()}-${file.name}`;
        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(filePath);
        
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        await fileRef.save(fileBuffer, {
            metadata: {
                contentType: file.type,
            },
        });

        const [publicUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // Far-future expiration date
        });

        await adminDb.collection('users').doc(userId).update({
            avatarUrl: publicUrl,
        });

        // Revalidate user-related paths if needed
        revalidatePath('/my-collectoroom');
        revalidatePath('/my-collectoroom/settings');

        return { success: true, avatarUrl: publicUrl };
    } catch (error: any) {
        console.error('Error updating avatar:', error);
        return { success: false, message: 'Failed to update avatar.', avatarUrl: null };
    }
}
