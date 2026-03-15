
"use server";

import prisma from '@/lib/prisma';
import { User } from '@/lib/types';
import { clerkClient } from '@clerk/nextjs/server';


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
        const client = await clerkClient();
        const [clerkUser, userRecord] = await Promise.all([
            client.users.getUser(userId),
            prisma.user.findUnique({ where: { id: userId } }),
        ]);

        if (!clerkUser) return null;

        const user: User = {
            id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || 'No email',
            username: clerkUser.username || 'User',
            avatar: clerkUser.imageUrl,
            planId: FREE_PLAN.planId,
            cardCount: 0,
            collectionCount: 0,
            plan: FREE_PLAN,
        };

        if (userRecord) {
            user.planId = userRecord.plan_id || FREE_PLAN.planId;
            user.cardCount = userRecord.card_count || 0;
            user.collectionCount = userRecord.collection_count || 0;
            if (user.planId === PRO_PLAN.planId) user.plan = PRO_PLAN;
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
        const client = await clerkClient();
        await client.users.updateUser(userId, { username });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating username:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function deleteUser(userId: string) {
    try {
        const client = await clerkClient();
        await client.users.deleteUser(userId);
        await prisma.user.deleteMany({ where: { id: userId } });
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function toggleFollow({ targetUserId, currentUserId }: { targetUserId: string; currentUserId: string }) {
    try {
        const existing = await prisma.userFollow.findUnique({ where: { follower_id_following_id: { follower_id: currentUserId, following_id: targetUserId } } });

        if (existing) {
            await prisma.$transaction(async (tx) => {
                await tx.userFollow.delete({ where: { follower_id_following_id: { follower_id: currentUserId, following_id: targetUserId } } });
                await tx.user.updateMany({ where: { id: currentUserId }, data: { following_count: { decrement: 1 } } });
                await tx.user.updateMany({ where: { id: targetUserId }, data: { followers_count: { decrement: 1 } } });
            });
            return { success: true, isFollowing: false };
        } else {
            await prisma.$transaction(async (tx) => {
                await tx.userFollow.create({ data: { follower_id: currentUserId, following_id: targetUserId } });
                await tx.user.updateMany({ where: { id: currentUserId }, data: { following_count: { increment: 1 } } });
                await tx.user.updateMany({ where: { id: targetUserId }, data: { followers_count: { increment: 1 } } });
            });
            return { success: true, isFollowing: true };
        }
    } catch (error: any) {
        console.error('Error toggling follow:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function updateAvatar(userId: string, avatarUrl: string) {
    try {
        const client = await clerkClient();
        await client.users.updateUser(userId, { imageUrl: avatarUrl });
        await prisma.user.updateMany({ where: { id: userId }, data: { avatar: avatarUrl } });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating avatar:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
