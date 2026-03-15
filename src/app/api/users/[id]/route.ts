import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const client = await clerkClient();
    const [dbUser, clerkUser] = await Promise.all([
      prisma.user.findUnique({ where: { id } }),
      client.users.getUser(id).catch(() => null),
    ]);

    if (!dbUser && !clerkUser) return NextResponse.json(null, { status: 404 });

    const emailPrefix = clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0];
    const username = dbUser?.username || clerkUser?.username || clerkUser?.firstName || clerkUser?.fullName || emailPrefix || id;
    const avatarUrl = dbUser?.avatar || clerkUser?.imageUrl || null;
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || null;

    // Bootstrap: if ADMIN_USER_ID env var matches, ensure this user is admin in DB
    const isBootstrapAdmin = !!process.env.ADMIN_USER_ID && process.env.ADMIN_USER_ID === id;

    if (!dbUser) {
      // First login — create the user record in the DB
      await prisma.user.create({
        data: {
          id,
          is_admin: isBootstrapAdmin,
        },
      }).catch(() => null); // ignore race conditions (concurrent requests)
    } else if (isBootstrapAdmin && !dbUser.is_admin) {
      // Env var admin promotion
      await prisma.user.update({ where: { id }, data: { is_admin: true } }).catch(() => null);
    }

    const isAdmin = isBootstrapAdmin || dbUser?.is_admin || false;

    return NextResponse.json({
      id,
      username,
      email,
      avatarUrl,
      tier: 'Hobbyist',
      isAdmin,
      followerCount: dbUser?.followers_count || 0,
      followingCount: dbUser?.following_count || 0,
    });
  } catch (error) {
    console.error('GET /api/users/[id] error', error);
    return NextResponse.json(null, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { id: userId } });
    if (!requester || (requester.id !== userId && !requester.is_admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (typeof body.avatarUrl === 'string') updateData.avatar = body.avatarUrl;
    if (typeof body.isAdmin === 'boolean') updateData.is_admin = body.isAdmin;
    if (typeof body.username === 'string' && body.username.trim()) updateData.username = body.username.trim();

    if (Object.keys(updateData).length > 0) {
      await prisma.user.updateMany({ where: { id }, data: updateData });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/users/[id] error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
