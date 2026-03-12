import GalleryClient from './GalleryClient';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function GalleryContent() {
  // Fetch public collections and categories server-side using Prisma
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  const collections = await prisma.collection.findMany({
    where: { is_public: true },
    orderBy: { created_at: 'desc' },
    include: { user: true },
  });

  // Build owners map (username may not be stored locally; use id as placeholder)
  const owners: Record<string, any> = {};
  collections.forEach((c) => {
    if (c.user) owners[c.user.id] = { id: c.user.id, username: c.user.username ?? c.user.id, avatar: c.user.avatar };
  });

  // Normalize collections to client-friendly shape
  const normalized = collections.map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    coverImage: c.cover_image || '',
    coverImageHint: c.cover_image_hint || '',
    isPublic: c.is_public,
    userId: c.user_id,
    cardCount: c.card_count || 0,
    category: c.category_id,
    keywords: c.keywords ? (Array.isArray(c.keywords) ? c.keywords : [c.keywords]) : [],
  }));

  return <GalleryClient initialCollections={normalized} initialCategories={categories} initialOwners={owners} />;
}
