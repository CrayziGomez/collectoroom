
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layers, User as UserIcon, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'all');

  useEffect(() => {
    const fetchPublicCollections = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'collections'), where('isPublic', '==', true));
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
  }, []);
  
  useEffect(() => {
    setSelectedCategory(categoryParam || 'all');
  }, [categoryParam]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
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
      const matchesCategory = selectedCategory === 'all' || (collection.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchesSearch = searchTerm === '' || 
        collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.keywords?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allCollections, selectedCategory, searchTerm]);

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Collection Gallery</h1>
        <p className="text-lg text-muted-foreground mt-2">Explore the amazing collections shared by our community.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Input 
          placeholder="Search by name or keyword..." 
          className="flex-grow" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
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
