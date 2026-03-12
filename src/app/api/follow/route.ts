import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { toggleFollow } from '@/app/actions/user-actions';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get('targetUserId');
  const { userId } = auth();
  if (!userId || !targetUserId) return NextResponse.json({ isFollowing: false });

  try {
    const existing = await prisma.userFollow.findUnique({ where: { follower_id_following_id: { follower_id: userId, following_id: targetUserId } } });
    return NextResponse.json({ isFollowing: Boolean(existing) });
  } catch (error) {
    console.error('follow GET error', error);
    return NextResponse.json({ isFollowing: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const targetUserId = body.targetUserId;
  const { userId } = auth();
  if (!userId || !targetUserId) return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });

  try {
    const result = await toggleFollow({ targetUserId, currentUserId: userId });
    return NextResponse.json({ success: true, isFollowing: result.isFollowing });
  } catch (error) {
    console.error('follow POST error', error);
    return NextResponse.json({ success: false, message: (error as any).message || 'Error' }, { status: 500 });
  }
}
