import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import AddCardClient from './AddCardClient';

export default async function AddCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: collectionId } = await params;
  if (!collectionId) return notFound();

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return notFound();

  const { userId } = await auth();
  if (!userId || userId !== collection.user_id) {
    return redirect('/my-collectoroom');
  }

  const normalized = {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    category: collection.category_id,
  };

  return <AddCardClient initialCollection={normalized} />;
}
