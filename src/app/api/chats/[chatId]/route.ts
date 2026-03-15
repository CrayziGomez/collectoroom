import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request, { params }: { params: { chatId: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const chatId = params.chatId;
    const url = new URL(req.url);
    const reset = url.searchParams.get('reset') === 'true';

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!chat.participant_ids.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Optionally reset unread count for user
    if (reset) {
      const unread = (chat.unread_count as any) || {};
      unread[userId] = 0;
      await prisma.chat.update({ where: { id: chatId }, data: { unread_count: unread } });
    }

    const messages = await prisma.message.findMany({ where: { chat_id: chatId }, orderBy: { created_at: 'asc' } });

    return NextResponse.json({
      id: chat.id,
      participantIds: chat.participant_ids,
      participants: chat.participants || {},
      lastMessage: chat.last_message || null,
      unreadCount: chat.unread_count || {},
      messages: messages.map(m => ({ id: m.id, chatId: m.chat_id, senderId: m.sender_id, text: m.text, timestamp: m.created_at }))
    });
  } catch (error) {
    console.error('GET /api/chats/[chatId] error', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { chatId: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const chatId = params.chatId;
    const body = await req.json();
    const text = (body.text || '').trim();
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!chat.participant_ids.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // create message
    const message = await prisma.message.create({ data: { chat_id: chatId, sender_id: userId, text } });

    // update last message and unread counts for other participants
    const otherIds = chat.participant_ids.filter((id) => id !== userId);
    const unread = (chat.unread_count as any) || {};
    otherIds.forEach(id => { unread[id] = (unread[id] || 0) + 1; });

    await prisma.chat.update({ where: { id: chatId }, data: { last_message: { text, timestamp: new Date() }, unread_count: unread, updated_at: new Date() } });

    return NextResponse.json({ success: true, message: { id: message.id, chatId: message.chat_id, senderId: message.sender_id, text: message.text, timestamp: message.created_at } });
  } catch (error) {
    console.error('POST /api/chats/[chatId] error', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
