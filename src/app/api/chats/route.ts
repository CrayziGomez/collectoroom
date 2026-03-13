import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json([]);

    const chats = await prisma.chat.findMany({
      where: { participant_ids: { has: userId } },
      orderBy: { updated_at: 'desc' },
    });

    const result = await Promise.all(chats.map(async (c) => {
      let participants = c.participants as any;
      if (!participants) {
        const users = await prisma.user.findMany({ where: { id: { in: c.participant_ids } } });
        participants = {};
        users.forEach(u => { participants[u.id] = { username: u.id, avatarUrl: u.avatar || '' }; });
      }
      return {
        id: c.id,
        participantIds: c.participant_ids,
        participants,
        lastMessage: c.last_message,
        unreadCount: c.unread_count || {},
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/chats error', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const otherUserId = body.otherUserId as string;
    if (!otherUserId) return NextResponse.json({ error: 'otherUserId required' }, { status: 400 });
    if (otherUserId === userId) return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 });

    // Check existing chat by deterministic chat id
    const chatId = [userId, otherUserId].sort().join('_');
    let chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (chat) return NextResponse.json({ chatId: chat.id });

    // Build participants info using Clerk where possible
    const clerkClientInstance = await clerkClient();
    const [me, other] = await Promise.all([
      clerkClientInstance.users.getUser(userId),
      clerkClientInstance.users.getUser(otherUserId),
    ]).catch(() => [null, null]);

    const participants: Record<string, any> = {};
    if (me) participants[userId] = { username: me.username || me.id, avatarUrl: me.imageUrl };
    if (other) participants[otherUserId] = { username: other.username || other.id, avatarUrl: other.imageUrl };

    chat = await prisma.chat.create({ data: { id: chatId, participant_ids: [userId, otherUserId], participants } });

    return NextResponse.json({ chatId: chat.id });
  } catch (error) {
    console.error('POST /api/chats error', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
