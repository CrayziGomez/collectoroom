'use server';

import prisma from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  return dbUser?.is_admin ? dbUser : null;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  if (!await requireAdmin()) return { success: false, message: 'Unauthorized' };
  try {
    const [userCount, collectionCount, cardCount, categoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.collection.count(),
      prisma.card.count(),
      prisma.category.count(),
    ]);
    return { success: true, data: { userCount, collectionCount, cardCount, categoryCount } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  if (!await requireAdmin()) return { success: false, message: 'Unauthorized', users: [] };
  try {
    // Fetch up to 100 users from Clerk
    const client = await clerkClient();
    const { data: clerkUsers } = await client.users.getUserList({ limit: 100, orderBy: '-created_at' });

    // Fetch all DB records in one query
    const dbUsers = await prisma.user.findMany();
    const dbMap = new Map(dbUsers.map(u => [u.id, u]));

    const users = clerkUsers.map(cu => {
      const db = dbMap.get(cu.id);
      return {
        id: cu.id,
        username: cu.username || cu.firstName || cu.fullName || cu.id,
        email: cu.emailAddresses?.[0]?.emailAddress || '',
        avatarUrl: cu.imageUrl || '',
        isAdmin: db?.is_admin ?? false,
        cardCount: db?.card_count ?? 0,
        collectionCount: db?.collection_count ?? 0,
        createdAt: cu.createdAt,
      };
    });

    return { success: true, users };
  } catch (error: any) {
    console.error('getAllUsers error:', error);
    return { success: false, message: error.message, users: [] };
  }
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  if (!await requireAdmin()) return { success: false, message: 'Unauthorized' };
  try {
    // Upsert in case the user row doesn't exist yet
    await prisma.user.upsert({
      where: { id: userId },
      update: { is_admin: isAdmin },
      create: { id: userId, is_admin: isAdmin },
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function grantAdminRole(userId: string) {
  return setUserAdmin(userId, true);
}

export async function revokeAdminRole(userId: string) {
  return setUserAdmin(userId, false);
}

export async function adminDeleteUser(userId: string) {
  if (!await requireAdmin()) return { success: false, message: 'Unauthorized' };
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    await prisma.user.deleteMany({ where: { id: userId } });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
