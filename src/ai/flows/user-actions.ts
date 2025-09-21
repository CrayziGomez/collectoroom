
'use server';

/**
 * @fileOverview User action flows, such as following/unfollowing.
 *
 * - toggleFollow - Toggles the follow state between two users.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, runTransaction } from 'firebase/firestore';
import { getAdminInstances } from '@/lib/firebase-admin';

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
    const { adminAuth, adminDb } = getAdminInstances();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('Authentication failed.');
    }

    const currentUserId = decodedToken.uid;
    if (currentUserId === targetUserId) {
      throw new Error('Users cannot follow themselves.');
    }

    try {
      // Use the adminDb from firebase-admin for the transaction
      const newState = await runTransaction(adminDb, async (transaction) => {
        const currentUserRef = doc(adminDb, 'users', currentUserId);
        const targetUserRef = doc(adminDb, 'users', targetUserId);
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
          const targetUserDoc = await transaction.get(targetUserDoc);
          
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
