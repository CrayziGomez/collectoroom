
'use server';

import { getAdminInstances } from '@/lib/firebase-admin';
import { runTransaction } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { onUserCreate } from 'firebase-functions/v2/auth';
import type { UserRecord } from 'firebase-admin/auth';
import { AppUser } from '@/lib/types';


async function createUserDocument(user: UserRecord): Promise<void> {
  const { adminDb } = getAdminInstances();
  const userDocRef = adminDb.collection('users').doc(user.uid);

  const username = user.email?.split('@')[0] || 'New User';
  const isAdmin = user.email === 'admin@collectoroom.com';

  const newUser: AppUser = {
    uid: user.uid,
    id: user.uid,
    email: user.email || '',
    username: username,
    tier: isAdmin ? 'Curator' : 'Hobbyist', // Default to Hobbyist for new users
    isAdmin: isAdmin,
    followerCount: 0,
    followingCount: 0,
  };

  await userDocRef.set(newUser);
}


export const onusercreate = onUserCreate(async (event) => {
    try {
        await createUserDocument(event.data);
        console.log(`User document created for UID: ${event.data.uid}`);
    } catch (error) {
        console.error(`Error creating user document for UID: ${event.data.uid}`, error);
    }
});


export async function toggleFollow(input: { targetUserId: string, currentUserId: string }) {
    const { targetUserId, currentUserId } = input;
    const { adminDb } = getAdminInstances();

    if (currentUserId === targetUserId) {
      throw new Error('Users cannot follow themselves.');
    }

    try {
      const newState = await runTransaction(adminDb, async (transaction) => {
        const currentUserRef = adminDb.collection('users').doc(currentUserId);
        const targetUserRef = adminDb.collection('users').doc(targetUserId);
        const followingRef = currentUserRef.collection('following').doc(targetUserId);
        const followerRef = targetUserRef.collection('followers').doc(currentUserId);
        const targetUserSnap = await transaction.get(targetUserRef);
        const targetUserData = targetUserSnap.data();

        if (!targetUserData) {
          throw new Error('Target user does not exist.');
        }

        const followingSnap = await transaction.get(followingRef);
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
            senderName: (await transaction.get(currentUserRef)).data()?.username || 'Someone',
            type: 'NEW_FOLLOWER',
            message: `${(await transaction.get(currentUserRef)).data()?.username || 'Someone'} started following you.`,
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
