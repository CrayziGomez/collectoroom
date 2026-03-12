import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import EditCardClient from './EditCardClient';

export default async function EditCardPage({ params }: { params: { id: string; cardId: string } }) {
  const collectionId = params.id;
  const cardId = params.cardId;

  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { images: true } });
  if (!card || card.collection_id !== collectionId) return notFound();

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return notFound();

  const { userId } = auth();
  if (!userId || userId !== card.user_id) return redirect('/my-collectoroom');

  const normalizedCard = {
    id: card.id,
    title: card.title,
    description: card.description,
    status: card.status,
    images: card.images.map((i: any) => ({ url: i.url, path: i.path, hint: i.hint })),
    createdAt: card.created_at,
  };

  const normalizedCollection = { id: collection.id, name: collection.name };

  return <EditCardClient initialCard={normalizedCard} initialCollection={normalizedCollection} />;
}
