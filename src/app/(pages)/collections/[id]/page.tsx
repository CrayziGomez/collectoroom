
'use client';

import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Collection, Card as CardType, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [collectionData, setCollectionData] = useState<Collection | null>(null);
  const [collectionOwner, setCollectionOwner] = useState<User | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!collectionId) return;

    setLoading(true);
    const collectionRef = doc(db, 'collections', collectionId);

    const unsubscribeCollection = onSnapshot(collectionRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as Collection;
            const isOwner = !authLoading && user?.uid === data.userId;
            const isAdmin = !authLoading && user?.isAdmin === true;

            if (!data.isPublic && !isOwner && !isAdmin) {
                toast({ title: "Access Denied", description: "This collection is private.", variant: "destructive" });
                router.push('/gallery');
                return;
            }

            setCollectionData({ ...data, id: docSnap.id });

            // Fetch owner data
            if (data.userId) {
                const ownerRef = doc(db, 'users', data.userId);
                const ownerSnap = await getDoc(ownerRef);
                if (ownerSnap.exists()) {
                    setCollectionOwner(ownerSnap.data() as User);
                }
            }

            // Fetch cards for this collection
            const cardsQuery = query(collection(db, 'cards'), where('collectionId', '==', collectionId));
            const unsubscribeCards = onSnapshot(cardsQuery, (querySnapshot) => {
                const cardsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as CardType);
                setCards(cardsData);
                if(loading) setLoading(false);
            }, (error) => {
                console.error("Error fetching cards:", error);
                setLoading(false);
            });
            
            return () => unsubscribeCards();

        } else {
            notFound();
        }
    }, (error) => {
        console.error("Error fetching collection:", error);
        setLoading(false);
        notFound();
    });

    return () => unsubscribeCollection();

  }, [collectionId, user, authLoading, router, toast, loading]);
  
  if (loading || authLoading) {
      return (
          <div className="container py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }
  
  if (!collectionData) {
    return null;
  }

  const isOwner = user?.uid === collectionData.userId;

  return (
    <div className="container py-8">
      {/* Collection Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2">{collectionData.category}</Badge>
            <h1 className="text-4xl font-bold font-headline">{collectionData.name}</h1>
            <p className="text-lg text-muted-foreground mt-2 max-w-2xl">{collectionData.description}</p>
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                {collectionOwner?.avatarUrl && <AvatarImage src={collectionOwner.avatarUrl} alt={collectionOwner.username} />}
                <AvatarFallback>{collectionOwner?.username?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>By {collectionOwner?.username || 'Unknown User'}</span>
              <span>·</span>
              <span>{collectionData.cardCount || 0} cards</span>
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Collection</Button>
              <Button asChild>
                <Link href={`/collections/${collectionData.id}/add`}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Card
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
       {cards.length === 0 && !isOwner ? (
         <div className="text-center py-12 text-muted-foreground">
            <p>This collection is empty.</p>
         </div>
       ) : (
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
              <Link href={`/collections/${collectionData.id}/add`} className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg hover:bg-muted transition-colors p-6 aspect-[3/4]">
                  <PlusCircle className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-semibold text-center">Add New Card</p>
              </Link>
            )}
          </div>
       )}
    </div>
  );
}
