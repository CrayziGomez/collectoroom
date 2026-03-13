import CollectionClient from './CollectionClient';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: collectionId } = await params;
  if (!collectionId) return notFound();

  // Fetch collection, owner and cards from Prisma
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      user: true,
      cards: { include: { images: true }, orderBy: { created_at: 'desc' } },
      category: true,
    },
  });

  if (!collection) return notFound();

  // Get current user (needed for ownership check and private collection access)
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    userId = null;
  }

  // Check permissions for private collections
  if (!collection.is_public) {
    if (!userId || (userId !== collection.user_id)) {
      const maybeUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
      if (!maybeUser || !maybeUser.is_admin) {
        return redirect('/gallery');
      }
    }
  }

  // Fetch owner username from Clerk (DB users table has no username column)
  let ownerUsername = collection.user_id;
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(collection.user_id);
    ownerUsername = clerkUser.username || clerkUser.firstName || clerkUser.fullName || collection.user_id;
  } catch {}

  const normalizedCollection = {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isPublic: collection.is_public,
    category: collection.category?.name ?? collection.category_id ?? '',
    cardCount: collection.card_count ?? collection.cards.length,
    coverImage: collection.cover_image ?? '',
    coverImageHint: collection.cover_image_hint ?? '',
    userId: collection.user_id,
    keywords: collection.keywords ? (Array.isArray(collection.keywords) ? collection.keywords : [collection.keywords]) : [],
    createdAt: collection.created_at,
  };

  const owner = {
    id: collection.user_id,
    username: ownerUsername,
    avatarUrl: collection.user?.avatar ?? undefined,
  };

  const cards = collection.cards.map((c) => ({
    id: c.id,
    collectionId: c.collection_id,
    userId: c.user_id,
    title: c.title,
    description: c.description,
    images: c.images.map((img: any) => ({ url: img.url, path: img.path, hint: img.hint })),
    category: c.category_id,
  }));

  return <CollectionClient initialCollection={normalizedCollection} initialOwner={owner} initialCards={cards} />;
}
