
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, PlusCircle, Settings, Share2, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Collection } from '@/lib/types';

const tierLimits = {
  Hobbyist: { cards: 50, collections: 2 },
  Explorer: { cards: 300, collections: 10 },
  Collector: { cards: 600, collections: 30 },
  Curator: { cards: Infinity, collections: Infinity },
};

export default function MyCollectoRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userCollections, setUserCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  useEffect(() => {
    if (!user) return;

    setCollectionsLoading(true);
    const q = query(collection(db, 'collections'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const collectionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Collection);
      setUserCollections(collectionsData);
      setCollectionsLoading(false);
    }, (error) => {
        console.error("Error fetching collections:", error);
        setCollectionsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading || !user) {
    return (
        <div className="container py-8">
            <Card className="mb-8">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                </div>
                <Skeleton className="h-10 w-36" />
                </CardHeader>
                <CardContent>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
                </CardContent>
            </Card>
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        </div>
    );
  }

  const totalCards = userCollections.reduce((acc, c) => acc + (c.cardCount || 0), 0);
  const cardLimit = tierLimits[user.tier].cards;
  const collectionLimit = tierLimits[user.tier].collections;
  const cardUsage = cardLimit === Infinity ? 0 : (totalCards / cardLimit) * 100;
  const collectionUsage = collectionLimit === Infinity ? 0 : (userCollections.length / collectionLimit) * 100;

  return (
    <div className="container py-8">
      <Card className="mb-8">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary">
              <AvatarImage src={user.avatarUrl || ''} alt={user.username} />
              <AvatarFallback className="text-3xl">{user.username?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold font-headline">{user.username}</h1>
              <p className="text-muted-foreground">My digital collection space</p>
              <Badge variant="outline" className="mt-2">{user.tier} Plan</Badge>
            </div>
          </div>
          <Button variant="outline"><Settings className="mr-2 h-4 w-4" />Profile Settings</Button>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <p className="font-medium">Card Usage</p>
                <p className="text-muted-foreground">{totalCards} / {cardLimit === Infinity ? '∞' : cardLimit}</p>
              </div>
              <Progress value={cardUsage} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <p className="font-medium">Collection Usage</p>
                <p className="text-muted-foreground">{userCollections.length} / {collectionLimit === Infinity ? '∞' : collectionLimit}</p>
              </div>
              <Progress value={collectionUsage} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-headline">My Collections</h2>
        <Button asChild>
          <Link href="/my-collectoroom/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Collection
          </Link>
        </Button>
      </div>

       {collectionsLoading ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
         </div>
       ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {userCollections.map(collection => (
            <Card key={collection.id} className="overflow-hidden group flex flex-col">
              <CardHeader className="flex-row justify-between items-start p-4">
                  <div className="space-y-1">
                      <CardTitle className="text-lg">
                        <Link href={`/collections/${collection.id}`} className="hover:text-primary">{collection.name}</Link>
                      </CardTitle>
                      <CardDescription>{collection.cardCount || 0} cards</CardDescription>
                  </div>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                         <Link href={`/collections/${collection.id}`} className="flex items-center w-full">
                          <Settings className="mr-2 h-4 w-4" /> Manage
                         </Link>
                      </DropdownMenuItem>
                       <DropdownMenuItem>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </CardHeader>
              <CardContent className="p-0 flex-grow">
                 <Link href={`/collections/${collection.id}`}>
                   <Image
                      src={collection.coverImage}
                      alt={`Cover image for ${collection.name}`}
                      width={400}
                      height={300}
                      className="aspect-[4/3] object-cover w-full group-hover:opacity-90 transition-opacity"
                      data-ai-hint={collection.coverImageHint}
                    />
                  </Link>
              </CardContent>
              <CardFooter className="p-4">
                <Badge variant={collection.isPublic ? 'secondary' : 'outline'}>
                  {collection.isPublic ? 'Public' : 'Private'}
                </Badge>
              </CardFooter>
            </Card>
          ))}
           <Link href="/my-collectoroom/create">
              <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg hover:bg-muted transition-colors p-6 aspect-[3/1.8]">
                  <PlusCircle className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-semibold">Create New Collection</p>
              </div>
           </Link>
        </div>
      )}
    </div>
  );
}
