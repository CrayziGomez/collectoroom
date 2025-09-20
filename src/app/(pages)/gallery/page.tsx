
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layers, User as UserIcon, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Collection, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// This is a simplified approach to getting user data for the gallery.
// In a larger app, this might be denormalized onto the collection document
// or fetched more efficiently in batches.
async function fetchCollectionOwners(collections: Collection[]): Promise<Record<string, User>> {
    const userIds = [...new Set(collections.map(c => c.userId))];
    if (userIds.length === 0) return {};
    
    const owners: Record<string, User> = {};
    // Fetch users in chunks of 10 which is a firestore limitation for 'in' queries
    for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
        const querySnapshot = await getDocs(usersQuery);
        querySnapshot.forEach(doc => {
            owners[doc.id] = doc.data() as User;
        });
    }
    return owners;
}


export default function GalleryPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicCollections = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'collections'), where('isPublic', '==', true));
            const querySnapshot = await getDocs(q);
            const collectionsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Collection);
            setCollections(collectionsData);
            
            const ownerData = await fetchCollectionOwners(collectionsData);
            setOwners(ownerData);

        } catch (error) {
            console.error("Error fetching public collections:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchPublicCollections();
  }, []);

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Collection Gallery</h1>
        <p className="text-lg text-muted-foreground mt-2">Explore the amazing collections shared by our community.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Input placeholder="Search by name or keyword..." className="flex-grow" />
        <Select>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[320px] w-full" />
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
            <p>No public collections found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {collections.map(collection => {
            const owner = owners[collection.userId];
            return (
              <Card key={collection.id} className="overflow-hidden group">
                <Link href={`/collections/${collection.id}`}>
                  <CardContent className="p-0">
                    <div className="relative">
                      <Image
                        src={collection.coverImage}
                        alt={`Cover image for ${collection.name}`}
                        width={400}
                        height={300}
                        className="aspect-[4/3] object-cover w-full group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint={collection.coverImageHint}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <Badge variant="secondary" className="absolute top-2 right-2">{collection.category}</Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary">{collection.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 h-[40px] mt-1">{collection.description}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between text-xs text-muted-foreground p-4 pt-0">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      <span>{owner?.username || 'Unknown User'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      <span>{collection.cardCount} cards</span>
                    </div>
                  </CardFooter>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
