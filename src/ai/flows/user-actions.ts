
'use server';

/**
 * @fileOverview User action flows, such as following/unfollowing.
 *
 * - toggleFollow - Toggles the follow state between two users.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, doc, runTransaction } from 'firebase/firestore';
import { app as clientApp } from '@/lib/firebase';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { auth } from 'firebase-admin';

// Ensure Firebase Admin is initialized
if (!getApps().length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. The Admin SDK requires this for initialization.');
    }
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (e: any) {
        console.error('Failed to parse or initialize Firebase Admin SDK from environment variable.', e.message);
        throw new Error('Firebase Admin SDK initialization failed. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string.');
    }
}


const db = getFirestore(clientApp);

const ToggleFollowInputSchema = z.object({
  idToken: z.string().describe("The user's Firebase ID token."),
  targetUserId: z.string().describe('The ID of the user to follow or unfollow.'),
});

const ToggleFollowOutputSchema = z.object({
  newState: z.enum(['followed', 'unfollowed']).describe('The new follow state.'),
});

/**
 * Toggles the follow state between the authenticated user and a target user.
 * This flow is transactional and ensures all database updates succeed or fail together.
 */
export const toggleFollow = ai.defineFlow(
  {
    name: 'toggleFollow',
    inputSchema: ToggleFollowInputSchema,
    outputSchema: ToggleFollowOutputSchema,
  },
  async ({ idToken, targetUserId }) => {
    let decodedToken;
    try {
      decodedToken = await auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('Authentication failed.');
    }

    const currentUserId = decodedToken.uid;
    if (currentUserId === targetUserId) {
      throw new Error('Users cannot follow themselves.');
    }

    try {
      const newState = await runTransaction(db, async (transaction) => {
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);
        const followingRef = doc(currentUserRef, 'following', targetUserId);

        const followingSnap = await transaction.get(followingRef);
        const isCurrentlyFollowing = followingSnap.exists();
        
        let finalState: 'followed' | 'unfollowed';

        if (isCurrentlyFollowing) {
          // --- Unfollow Logic ---
          const followerRef = doc(targetUserRef, 'followers', currentUserId);
          transaction.delete(followingRef);
          transaction.delete(followerRef);
          
          const currentUserDoc = await transaction.get(currentUserRef);
          const targetUserDoc = await transaction.get(targetUserRef);

          const newFollowingCount = Math.max(0, (currentUserDoc.data()?.followingCount || 0) - 1);
          const newFollowerCount = Math.max(0, (targetUserDoc.data()?.followerCount || 0) - 1);

          transaction.update(currentUserRef, { followingCount: newFollowingCount });
          transaction.update(targetUserRef, { followerCount: newFollowerCount });
          
          finalState = 'unfollowed';
        } else {
          // --- Follow Logic ---
          const followerRef = doc(targetUserRef, 'followers', currentUserId);
          transaction.set(followingRef, { timestamp: new Date() });
          transaction.set(followerRef, { timestamp: new Date() });

          const currentUserDoc = await transaction.get(currentUserRef);
          const targetUserDoc = await transaction.get(targetUserRef);
          
          const newFollowingCount = (currentUserDoc.data()?.followingCount || 0) + 1;
          const newFollowerCount = (targetUserDoc.data()?.followerCount || 0) + 1;

          transaction.update(currentUserRef, { followingCount: newFollowingCount });
          transaction.update(targetUserRef, { followerCount: newFollowerCount });

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
);
