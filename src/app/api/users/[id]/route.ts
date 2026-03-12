import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json(null, { status: 404 });

    return NextResponse.json({
      id: user.id,
      username: user.id,
      email: null,
      avatarUrl: user.avatar || null,
      tier: 'Hobbyist',
      isAdmin: user.is_admin || false,
      followerCount: user.followers_count || 0,
      followingCount: user.following_count || 0,
    });
  } catch (error) {
    console.error('GET /api/users/[id] error', error);
    return NextResponse.json(null, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only allow the user themselves or an admin to patch
    const requester = await prisma.user.findUnique({ where: { id: userId } });
    if (!requester || (requester.id !== userId && !requester.is_admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (typeof body.username === 'string') updateData.username = body.username;
    if (typeof body.avatarUrl === 'string') updateData.avatar = body.avatarUrl;
    if (typeof body.isAdmin === 'boolean') updateData.is_admin = body.isAdmin;

    await prisma.user.updateMany({ where: { id }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/users/[id] error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
