import GalleryClient from './GalleryClient';
import prisma from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import { resolveDisplayName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function GalleryContent() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  const collections = await prisma.collection.findMany({
    where: { is_public: true },
    orderBy: { created_at: 'desc' },
    include: { user: true, category: true },
  });

  // Batch-fetch display names: DB username first, then Clerk fallback
  const ownerIds = [...new Set(collections.map(c => c.user_id))];
  const clerkUsers: Record<string, any> = {};
  if (ownerIds.length > 0) {
    try {
      const client = await clerkClient();
      await Promise.all(
        ownerIds.map(async (id) => {
          clerkUsers[id] = await client.users.getUser(id).catch(() => null);
        })
      );
    } catch {}
  }

  const owners: Record<string, any> = {};
  collections.forEach((c) => {
    owners[c.user_id] = {
      id: c.user_id,
      username: resolveDisplayName(c.user?.username, clerkUsers[c.user_id]),
      avatar: c.user?.avatar ?? '',
    };
  });

  const normalized = collections.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    coverImage: c.cover_image || '',
    coverImageHint: c.cover_image_hint || '',
    isPublic: c.is_public,
    userId: c.user_id,
    cardCount: c.card_count || 0,
    category: c.category?.name ?? '',
    keywords: c.keywords ? (Array.isArray(c.keywords) ? c.keywords : [c.keywords]) : [],
  }));

  return <GalleryClient initialCollections={normalized} initialCategories={categories} initialOwners={owners} />;
}
