import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import EditCollectionClient from './EditCollectionClient';

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: collectionId } = await params;
  if (!collectionId) return notFound();

  const collection = await prisma.collection.findUnique({ where: { id: collectionId }, include: { cards: { include: { images: true } } } });
  if (!collection) return notFound();

  const { userId } = await auth();
  if (!userId || userId !== collection.user_id) return redirect('/my-collectoroom');

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  const normalizedCollection = {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    keywords: collection.keywords || '',
    category: collection.category_id || '',
    isPublic: collection.is_public,
    coverImage: collection.cover_image || '',
    coverImageHint: collection.cover_image_hint || '',
  };

  const cardImages = collection.cards.flatMap(c => c.images.map(img => ({ url: img.url, hint: img.hint })));

  return <EditCollectionClient initialCollection={normalizedCollection} initialCategories={categories} initialImages={cardImages} />;
}

