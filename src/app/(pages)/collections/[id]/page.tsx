import CollectionClient from './CollectionClient';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({ params }: { params: { id: string } }) {
  const collectionId = params.id;
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

  const { userId } = auth();

  // Check permissions for private collections
  if (!collection.is_public) {
    if (!userId || (userId !== collection.user_id)) {
      // Check admin
      const maybeUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
      if (!maybeUser || !maybeUser.is_admin) {
        return redirect('/gallery');
      }
    }
  }

  // Normalize shapes for the client component
  const normalizedCollection = {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isPublic: collection.is_public,
    category: collection.category_id || (collection.category?.name ?? ''),
    cardCount: collection.card_count ?? collection.cards.length,
    coverImage: collection.cover_image ?? '',
    coverImageHint: collection.cover_image_hint ?? '',
    userId: collection.user_id,
    keywords: collection.keywords ? (Array.isArray(collection.keywords) ? collection.keywords : [collection.keywords]) : [],
    createdAt: collection.created_at,
  };

  const owner = collection.user ? {
    id: collection.user.id,
    username: (collection.user as any).username ?? collection.user.id,
    avatarUrl: (collection.user as any).avatar ?? undefined,
  } : null;

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
