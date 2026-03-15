import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ unreadChats: 0, unreadNotifications: 0 });

    const unreadChats = await prisma.chat.count({ where: { participant_ids: { has: userId } } }).catch(() => 0);

    // Simple notifications unread count
    const unreadNotifications = await prisma.notification.count({ where: { recipient_id: userId, is_read: false } }).catch(() => 0);

    return NextResponse.json({ unreadChats, unreadNotifications });
  } catch (error) {
    console.error('notifications counts error', error);
    return NextResponse.json({ unreadChats: 0, unreadNotifications: 0 }, { status: 500 });
  }
}
