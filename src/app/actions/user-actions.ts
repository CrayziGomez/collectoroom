
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';


const FREE_PLAN = {
  planId: 'free',
  name: 'Free',
  cardLimit: 5,
  collectionLimit: 1,
};

const PRO_PLAN = {
  planId: 'plan_pro',
  name: 'Pro',
  cardLimit: 100,
  collectionLimit: 10,
};

// Gets a user's data, merging from Clerk and Firestore
export async function getUser(userId: string): Promise<User | null> {
    try {
        const { clerkClient } = await import('@clerk/nextjs/server');

        const [clerkUser, userDoc] = await Promise.all([
            clerkClient.users.getUser(userId),
            adminDb.collection('users').doc(userId).get(),
        ]);

        if (!clerkUser) return null;

        const user: User = {
            id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || 'No email',
            username: clerkUser.username || 'User',
            avatar: clerkUser.imageUrl,
            planId: FREE_PLAN.planId, // Default to free plan
            cardCount: 0,
            collectionCount: 0,
            plan: FREE_PLAN,
        };

        if (userDoc.exists) {
            const userData = userDoc.data();
            user.planId = userData?.planId || FREE_PLAN.planId;
            user.cardCount = userData?.cardCount || 0;
            user.collectionCount = userData?.collectionCount || 0;

            if (user.planId === PRO_PLAN.planId) {
                user.plan = PRO_PLAN;
            }
        }

        return user;

    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

// Updates a user's username
export async function updateUsername(userId: string, username: string) {
    try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        await clerkClient.users.updateUser(userId, { username });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating username:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function deleteUser(userId: string) {
    try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        await clerkClient.users.deleteUser(userId);
        await adminDb.collection('users').doc(userId).delete();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function toggleFollow({ targetUserId, currentUserId }: { targetUserId: string; currentUserId: string }) {
    const currentUserRef = adminDb.collection('users').doc(currentUserId);
    const targetUserRef = adminDb.collection('users').doc(targetUserId);
    const followingRef = currentUserRef.collection('following').doc(targetUserId);

    try {
        const isFollowing = (await followingRef.get()).exists;

        if (isFollowing) {
            await followingRef.delete();
            await targetUserRef.collection('followers').doc(currentUserId).delete();
            await currentUserRef.update({ followingCount: FieldValue.increment(-1) });
            await targetUserRef.update({ followersCount: FieldValue.increment(-1) });
        } else {
            await followingRef.set({ followedAt: FieldValue.serverTimestamp() });
            await targetUserRef.collection('followers').doc(currentUserId).set({ followedAt: FieldValue.serverTimestamp() });
            await currentUserRef.update({ followingCount: FieldValue.increment(1) });
            await targetUserRef.update({ followersCount: FieldValue.increment(1) });
        }

        return { success: true, isFollowing: !isFollowing };
    } catch (error: any) {
        console.error('Error toggling follow:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function updateAvatar(userId: string, avatarUrl: string) {
    try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        await clerkClient.users.updateUser(userId, { imageUrl: avatarUrl });
        await adminDb.collection('users').doc(userId).update({ avatar: avatarUrl });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating avatar:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
