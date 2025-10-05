'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layers, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Collection, User, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export const dynamic = 'force-dynamic';

// Fetches owner details for the given collections
async function fetchCollectionOwners(collections: Collection[]): Promise<Record<string, User>> {
    const userIds = [...new Set(collections.map(c => c.userId))];
    if (userIds.length === 0) return {};

    const owners: Record<string, User> = {};
    const userBatches: string[][] = [];
    for (let i = 0; i < userIds.length; i += 10) {
        userBatches.push(userIds.slice(i, i + 10));
    }

    const fetchPromises = userBatches.map(async batch => {
        const userQuery = query(collection(db, 'users'), where('__name__', 'in', batch));
        const userSnap = await getDocs(userQuery);
        return userSnap.docs.map(d => ({ id: d.id, data: d.data() as User }));
    });

    const results = await Promise.all(fetchPromises);
    
    results.flat().forEach(result => {
        if (result) {
            owners[result.id] = result.data;
        }
    });

    return owners;
}

export default function GalleryContent() {
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('category');

  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'all');

  useEffect(() => {
    const fetchData = async () => {
        if (authLoading) return; 

        setLoading(true);
        try {
            const catQuerySnapshot = await getDocs(collection(db, 'categories'));
            const categoriesData = catQuerySnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Category);
            setCategories(categoriesData);

            const publicCollectionsQuery = query(collection(db, 'collections'), where('isPublic', '==', true));
            
            const queriesToRun = [getDocs(publicCollectionsQuery)];

            if (user) {
                const privateCollectionsQuery = query(
                    collection(db, 'collections'),
                    where('userId', '==', user.uid),
                    where('isPublic', '==', false)
                );
                queriesToRun.push(getDocs(privateCollectionsQuery));
            }
            
            const [publicSnapshot, privateSnapshot] = await Promise.all(queriesToRun);

            const collectionsMap = new Map<string, Collection>();

            publicSnapshot.forEach(doc => {
                 collectionsMap.set(doc.id, { ...doc.data(), id: doc.id } as Collection);
            });

            if (privateSnapshot) {
                privateSnapshot.forEach(doc => {
                    collectionsMap.set(doc.id, { ...doc.data(), id: doc.id } as Collection);
                });
            }
            
            const allFetchedCollections = Array.from(collectionsMap.values());

            const ownerData = await fetchCollectionOwners(allFetchedCollections);
            setOwners(ownerData);
            setAllCollections(allFetchedCollections);

        } catch (error) {
            console.error("Error fetching gallery data:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [user, authLoading]);
  
  useEffect(() => {
    setSelectedCategory(categoryParam || 'all');
  }, [categoryParam]);

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('category');
    } else {
      params.set('category', value);
    }
    router.push(`/gallery?${params.toString()}`);
  }

  const filteredCollections = useMemo(() => {
    return allCollections.filter(collection => {
      const matchesCategory = selectedCategory === 'all' || collection.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.keywords?.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allCollections, searchTerm, selectedCategory]);

  if (loading || authLoading) {
      return (
        <div className="container py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-headline">Collection Gallery</h1>
            <p className="text-lg text-muted-foreground mt-2">Exploring collections...</p>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Skeleton className="h-10 md:col-span-2" />
              <Skeleton className="h-10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Skeleton className="h-[320px] w-full" />
                <Skeleton className="h-[320px] w-full" />
                <Skeleton className="h-[320px] w-full" />
                <Skeleton className="h-[320px] w-full" />
            </div>
        </div>
      )
  }

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Collection Gallery</h1>
        <p className="text-lg text-muted-foreground mt-2">Explore amazing collections or see your own private work.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Input 
          placeholder="Search collections..." 
          className="md:col-span-2" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredCollections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
            <p>No collections found matching your criteria.</p>
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
                       <div className="absolute top-2 right-2 flex gap-1">
                         {collection.isPublic ? (
                            <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" />Public</Badge>
                         ) : (
                            <Badge variant="default"><EyeOff className="h-3 w-3 mr-1" />Private</Badge>
                         )}
                      </div>
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
