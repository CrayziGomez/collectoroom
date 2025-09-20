
'use client';

import { MOCK_COLLECTIONS, MOCK_CARDS, MOCK_USERS } from '@/lib/constants';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';


export default function CollectionPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const collection = MOCK_COLLECTIONS.find(c => c.id === params.id);
  
  if (!collection) {
    notFound();
  }
  
  useEffect(() => {
    if (!loading && !user && !collection.isPublic) {
      router.push('/login');
    }
  }, [user, loading, router, collection.isPublic]);

  // TODO: Replace with real data once Firestore is connected for users
  const collectionOwner = MOCK_USERS.find(u => u.id === collection.userId);
  const cards = MOCK_CARDS.filter(c => c.collectionId === params.id);
  
  const isOwner = user?.uid === collection.userId;

  return (
    <div className="container py-8">
      {/* Collection Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2">{collection.category}</Badge>
            <h1 className="text-4xl font-bold font-headline">{collection.name}</h1>
            <p className="text-lg text-muted-foreground mt-2 max-w-2xl">{collection.description}</p>
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                {collectionOwner?.avatarUrl && <AvatarImage src={collectionOwner.avatarUrl} alt={collectionOwner.username} />}
                <AvatarFallback>{collectionOwner?.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>By {collectionOwner?.username}</span>
              <span>·</span>
              <span>{cards.length} cards</span>
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Collection</Button>
              <Button asChild>
                <Link href={`/collections/${collection.id}/add`}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Card
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {cards.map(card => (
          <Card key={card.id} className="overflow-hidden group">
            <CardContent className="p-0">
              <Image
                src={card.imageUrl}
                alt={card.title}
                width={300}
                height={400}
                className="aspect-[3/4] object-cover w-full group-hover:scale-105 transition-transform duration-300"
                data-ai-hint={card.imageHint}
              />
            </CardContent>
            <div className="p-4">
              <h3 className="font-semibold truncate">{card.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{card.status}</p>
            </div>
          </Card>
        ))}
        {isOwner && (
          <Link href={`/collections/${collection.id}/add`} className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg hover:bg-muted transition-colors p-6 aspect-[3/4]">
              <PlusCircle className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground font-semibold text-center">Add New Card</p>
          </Link>
        )}
      </div>
    </div>
  );
}
