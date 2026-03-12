import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const collections = await prisma.collection.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    const mapped = collections.map((c) => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      description: c.description || '',
      isPublic: c.is_public,
      category: c.category_id || '',
      cardCount: c.card_count || 0,
      coverImage: c.cover_image || '',
      coverImageHint: c.cover_image_hint || '',
      keywords: c.keywords || '',
      createdAt: c.created_at,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching user collections:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
