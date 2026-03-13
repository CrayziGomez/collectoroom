import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import CardClient from './CardClient';

export const dynamic = 'force-dynamic';

export default async function CardPage({ params }: { params: Promise<{ id: string; cardId: string }> }) {
  const { id: collectionId, cardId } = await params;
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { images: true } });
  if (!card || card.collection_id !== collectionId) return notFound();

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return notFound();

  const { userId } = await auth();
  if (!collection.is_public) {
    if (!userId || (userId !== collection.user_id)) {
      const maybeUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
      if (!maybeUser || !maybeUser.is_admin) return redirect('/gallery');
    }
  }

  const normalizedCard = {
    id: card.id,
    title: card.title,
    description: card.description,
    status: card.status,
    images: card.images.map((i: any) => ({ url: i.url, path: i.path, hint: i.hint })),
    createdAt: card.created_at,
  };

  const normalizedCollection = {
    id: collection.id,
    name: collection.name,
    isPublic: collection.is_public,
    userId: collection.user_id,
  };

  const isOwner = Boolean(userId && userId === collection.user_id);

  return <CardClient card={normalizedCard} collection={normalizedCollection} isOwner={isOwner} />;
}
