
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getUser } from '@/app/actions/user-actions';
import FollowButton from './FollowButton';
import MessageButton from './MessageButton';

type CollectionRow = {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  cover_image_hint?: string | null;
  category?: { id: string; name: string } | null;
};

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  if (!username) return notFound();

  const profileUser = await getUserByUsername(username);
  if (!profileUser) return notFound();

  const collections = await prisma.collection.findMany({
    where: { user_id: profileUser.id, is_public: true },
    orderBy: { created_at: 'desc' },
  }) as CollectionRow[];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={profileUser.avatar || ''} alt={profileUser.username} />
              <AvatarFallback className="text-4xl">{profileUser.username?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-4xl font-bold font-headline">{profileUser.username}</h1>
                <div className="flex items-center justify-center gap-4 mt-2 text-muted-foreground">
                    <span>
                        <span className="font-bold text-foreground">{profileUser.followers_count || 0}</span> Followers
                    </span>
                    <span>
                        <span className="font-bold text-foreground">{profileUser.following_count || 0}</span> Following
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <FollowButton targetUserId={profileUser.id} />
              <MessageButton otherUserId={profileUser.id} />
            </div>
        </div>
      </div>

      <div className="border-t pt-8">
         <h2 className="text-2xl font-bold font-headline mb-6 text-center">Public Collections</h2>
         {collections.length === 0 ? (
           <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <div className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4">This user has no public collections yet.</p>
           </div>
         ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map((collection) => (
              <Card key={collection.id} className="overflow-hidden group">
                <Link href={`/collections/${collection.id}`}>
                    <div className="relative">
                      <Image
                        src={collection.cover_image || ''}
                        alt={`Cover image for ${collection.name}`}
                        width={400}
                        height={300}
                        className="aspect-[4/3] object-cover w-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                       <Badge variant="secondary" className="absolute top-2 right-2">{collection.category?.name || ''}</Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary">{collection.name}</h3>
                       <p className="text-sm text-muted-foreground line-clamp-2 h-[40px] mt-1">{collection.description}</p>
                    </div>
                </Link>
              </Card>
            ))}
          </div>
         )}
       </div>
    </div>
  );
}

async function getUserByUsername(username: string) {
  try {
    // Try to find a local user record where the id equals the username (fallback)
    const byId = await prisma.user.findUnique({ where: { id: username } });
    if (byId) return byId;

    // If not present locally, return null. A future migration should add a mapping table
    // between Clerk usernames and Prisma user ids.
    return null;
  } catch (error) {
    console.error('getUserByUsername error:', error);
    return null;
  }
}
