
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layers, User as UserIcon } from 'lucide-react';
import { CATEGORIES, CARD_STATUSES } from '@/lib/constants';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Query, DocumentData } from 'firebase/firestore';
import type { Collection, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter } from 'next/navigation';

async function fetchCollectionOwners(collections: Collection[]): Promise<Record<string, User>> {
    const userIds = [...new Set(collections.map(c => c.userId))];
    if (userIds.length === 0) return {};
    
    const owners: Record<string, User> = {};
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
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('category');
  const statusParam = searchParams.get('status');

  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'all');
  const [selectedStatus, setSelectedStatus] = useState(statusParam || 'all');

  useEffect(() => {
    const fetchPublicCollections = async () => {
        setLoading(true);
        try {
            let q: Query<DocumentData> = query(collection(db, 'collections'), where('isPublic', '==', true));
            
            const queryCategory = searchParams.get('category');
            if (queryCategory) {
                 q = query(q, where('category', '==', queryCategory));
            }
            const queryStatus = searchParams.get('status');
            if (queryStatus) {
                q = query(q, where('cardStatuses', 'array-contains', queryStatus));
            }

            const querySnapshot = await getDocs(q);
            const collectionsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Collection);
            setAllCollections(collectionsData);
            
            const ownerData = await fetchCollectionOwners(collectionsData);
            setOwners(ownerData);

        } catch (error) {
            console.error("Error fetching public collections:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchPublicCollections();
  }, [searchParams]);
  
  useEffect(() => {
    setSelectedCategory(categoryParam || 'all');
    setSelectedStatus(statusParam || 'all');
  }, [categoryParam, statusParam]);

  const handleFilterChange = (type: 'category' | 'status', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(type);
    } else {
      params.set(type, value);
    }
    router.push(`/gallery?${params.toString()}`);
  }

  const filteredCollections = useMemo(() => {
    // Search term filtering is now done on the client side after the initial query
    return allCollections.filter(collection => {
      const matchesSearch = searchTerm === '' || 
        collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.keywords?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [allCollections, searchTerm]);

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Collection Gallery</h1>
        <p className="text-lg text-muted-foreground mt-2">Explore the amazing collections shared by our community.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Input 
          placeholder="Search by name or keyword..." 
          className="md:col-span-3" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedCategory} onValueChange={(value) => handleFilterChange('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={(value) => handleFilterChange('status', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by card status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CARD_STATUSES.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
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
      ) : filteredCollections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
            <p>No public collections found for the selected criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCollections.map(collection => {
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
