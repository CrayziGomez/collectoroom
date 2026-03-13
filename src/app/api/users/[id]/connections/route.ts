import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

async function enrichUsers(ids: string[]) {
  if (ids.length === 0) return [];
  const client = await clerkClient();
  return Promise.all(
    ids.map(async (id) => {
      const [dbUser, clerkUser] = await Promise.all([
        prisma.user.findUnique({ where: { id } }),
        client.users.getUser(id).catch(() => null),
      ]);
      return {
        id,
        uid: id,
        username: clerkUser?.username || clerkUser?.firstName || id,
        avatarUrl: dbUser?.avatar || clerkUser?.imageUrl || '',
        isAdmin: dbUser?.is_admin || false,
      };
    })
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const [followingLinks, followerLinks] = await Promise.all([
      prisma.userFollow.findMany({ where: { follower_id: id } }),
      prisma.userFollow.findMany({ where: { following_id: id } }),
    ]);

    const [following, followers] = await Promise.all([
      enrichUsers(followingLinks.map(l => l.following_id)),
      enrichUsers(followerLinks.map(l => l.follower_id)),
    ]);

    return NextResponse.json({ following, followers });
  } catch (error) {
    console.error('GET /api/users/[id]/connections error', error);
    return NextResponse.json({ following: [], followers: [] }, { status: 500 });
  }
}
