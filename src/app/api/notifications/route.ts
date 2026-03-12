import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json([], { status: 200 });

    const notifications = await prisma.notification.findMany({ where: { recipient_id: userId }, orderBy: { created_at: 'desc' } });

    // mark unread as read
    await prisma.notification.updateMany({ where: { recipient_id: userId, is_read: false }, data: { is_read: true } }).catch(() => {});

    return NextResponse.json(notifications.map(n => ({ id: n.id, recipientId: n.recipient_id, senderId: n.sender_id, senderName: n.sender_name, type: n.type, message: n.message, link: n.link, isRead: n.is_read, timestamp: n.created_at })));
  } catch (error) {
    console.error('GET /api/notifications error', error);
    return NextResponse.json([], { status: 500 });
  }
}
