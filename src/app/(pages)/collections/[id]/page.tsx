'use client';

import { useRouter, useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Loader2, Crown, MessageSquare, Pencil, Share2, UserPlus, UserCheck, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Collection, Card as CardType, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { tierLimits } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useChat } from '@/hooks/use-chat';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useFollow } from '@/hooks/use-follow';
import { toggleCollectionPrivacy } from '@/lib/actions/collection-actions';

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { createOrFindChat, isCreatingChat } = useChat();

  const [collectionData, setCollectionData] = useState<Collection | null>(null);
  const [collectionOwner, setCollectionOwner] = useState<User | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);

  const isOwner = useMemo(() => user?.uid === collectionData?.userId, [user, collectionData]);
  const { isFollowing, toggleFollow, isLoading: isFollowLoading, isProcessing: isFollowProcessing } = useFollow(collectionOwner?.uid || '');

   useEffect(() => {
    if (!collectionId || authLoading) return;

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const collectionRef = doc(db, 'collections', collectionId);
            const docSnap = await getDoc(collectionRef);

            if (!docSnap.exists()) {
                notFound();
                return;
            }

            const data = { ...docSnap.data(), id: docSnap.id } as Collection;
            const isUserOwner = user?.uid === data.userId;
            const isUserAdmin = user?.isAdmin === true;

            if (!data.isPublic && !isUserOwner && !isUserAdmin) {
                toast({ title: "Access Denied", description: "This collection is private.", variant: "destructive" });
                router.push('/gallery');
                return;
            }

            setCollectionData(data);

            if (data.userId) {
                const ownerRef = doc(db, 'users', data.userId);
                const ownerSnap = await getDoc(ownerRef);
                if (ownerSnap.exists()) {
                    setCollectionOwner({ ...(ownerSnap.data() as User), uid: ownerSnap.id });
                }
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching collection:", error);
            toast({ title: "Error", description: "Could not load the collection. You may not have permission.", variant: "destructive" });
            router.push('/gallery');
        }
    };

    fetchInitialData();

  }, [collectionId, user, authLoading, router, toast]);

  // Real-time updates for cards and collection after initial load and permission check
   useEffect(() => {
        if (!collectionId || !collectionData) return;

        const cardsQuery = query(collection(db, 'cards'), where('collectionId', '==', collectionId));
        const unsubscribeCards = onSnapshot(cardsQuery, (snapshot) => {
            const cardsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as CardType);
            setCards(cardsData);
        }, (error) => {
            console.error("Error fetching cards in real-time:", error);
            toast({ title: "Could not update cards", variant: "destructive"});
        });

        const collectionRef = doc(db, 'collections', collectionId);
        const unsubscribeCollection = onSnapshot(collectionRef, (docSnap) => {
            if (docSnap.exists()) {
                 setCollectionData({ ...docSnap.data(), id: docSnap.id } as Collection);
            } else {
                router.push('/gallery');
            }
        });

        return () => {
            unsubscribeCards();
            unsubscribeCollection();
        };

    }, [collectionId, collectionData, router, toast]);

   const handleStartChat = async () => {
    if (authLoading || !user || !collectionOwner || user.uid === collectionOwner.uid) return;
    
    const chatId = await createOrFindChat(collectionOwner.uid);
    if (chatId) {
      router.push(`/messages/${chatId}`);
    }
  };
  
  const handleShare = async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
            title: "Link Copied!",
            description: "The collection link has been copied to your clipboard.",
        });
    } catch (err) {
        console.error("Clipboard write failed:", err);
        toast({
            title: "Copy Failed",
            description: "Could not copy link. Please copy it manually.",
            variant: "destructive"
        });
    }
  };

  const handleTogglePrivacy = async () => {
    if (!collectionData) return;
    setIsPrivacyLoading(true);
    try {
        await toggleCollectionPrivacy(collectionData.id, !collectionData.isPublic);
        toast({
            title: `Collection is now ${!collectionData.isPublic ? 'Public' : 'Private'}`,
        });
    } catch (error) {
        console.error("Failed to toggle privacy:", error);
        toast({ title: "Error", description: "Could not change collection privacy.", variant: "destructive"});
    } finally {
        setIsPrivacyLoading(false);
    }
  }

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

  const cardLimit = user ? tierLimits[user.tier].cards : 0;
  const hasReachedCardLimit = user ? (collectionData.cardCount || 0) >= cardLimit : true;

  const FollowButtonIcon = isFollowing ? UserCheck : UserPlus;

  return (
    <div className="container py-8">
      {/* Collection Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{collectionData.category}</Badge>
                {collectionData.isPublic ? (
                    <Badge variant="outline"><Eye className="h-4 w-4 mr-1"/>Public</Badge>
                ) : (
                    <Badge variant="outline"><EyeOff className="h-4 w-4 mr-1"/>Private</Badge>
                )}
            </div>
            <h1 className="text-4xl font-bold font-headline">{collectionData.name}</h1>
            <p className="text-lg text-muted-foreground mt-2 max-w-2xl">{collectionData.description}</p>
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                {collectionOwner?.avatarUrl && <AvatarImage src={collectionOwner.avatarUrl} alt={collectionOwner.username} />}
                <AvatarFallback>{collectionOwner?.username?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>By {collectionOwner?.username || 'Unknown User'}</span>
              <span>·</span>
              {/* Step 4: Stabilized UI to use the single source of truth from the live-updated cards array */}
              <span>{cards.length} cards</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isOwner ? (
                <>
                <Button variant="outline" onClick={handleTogglePrivacy} disabled={isPrivacyLoading}>
                    {isPrivacyLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : (collectionData.isPublic ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>)}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/collections/${collectionData.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button asChild disabled={hasReachedCardLimit}>
                    <Link href={`/collections/${collectionData.id}/add`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Card
                    </Link>
                </Button>
                </>
            ) : user && collectionOwner && (
                <div className="flex items-center gap-2">
                 <Button variant="outline" onClick={toggleFollow} disabled={isFollowLoading || isFollowProcessing}>
                    {isFollowProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FollowButtonIcon className="mr-2 h-4 w-4" />}
                    {isFollowing ? 'Following' : 'Follow'}
                 </Button>
                 <Button variant="outline" onClick={handleStartChat} disabled={isCreatingChat || authLoading}>
                    {isCreatingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    Message
                </Button>
                </div>
            )}
            <Button variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
         {isOwner && hasReachedCardLimit && (
            <Alert className="mt-6">
              <Crown className="h-4 w-4" />
              <AlertTitle>Card Limit Reached!</AlertTitle>
              <AlertDescription>
                You've reached your limit of {cardLimit} cards for the {user?.tier} plan. 
                Please <Link href="/pricing" className="font-semibold text-primary underline">upgrade your plan</Link> to add more cards.
              </AlertDescription>
            </Alert>
          )}
      </div>

      {/* Cards Grid - The logic here is already correct, relying on cards.length */}
       {cards.length === 0 && !loading ? (
         <div className="text-center py-12 text-muted-foreground">
            <p>This collection is empty.</p>
            {isOwner && !hasReachedCardLimit && (
              <Button asChild className="mt-4">
                <Link href={`/collections/${collectionData.id}/add`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add your first card
                </Link>
              </Button>
            )}
         </div>
       ) : (
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cards.map(card => {
                const firstImage = card.images && card.images.length > 0 ? card.images[0] : null;
                return (
              <Card key={card.id} className="overflow-hidden group">
                <div className="relative">
                   {isOwner && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/collections/${collectionData.id}/cards/${card.id}/edit`} className="absolute top-2 right-2 z-10">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Edit Card</TooltipContent>
                    </Tooltip>
                  )}
                  <Link href={`/collections/${collectionData.id}/cards/${card.id}`}>
                    {firstImage ? (
                        <Image
                            src={firstImage.url}
                            alt={card.title}
                            width={300}
                            height={200}
                            className="aspect-[3/2] object-cover w-full group-hover:scale-105 transition-transform duration-300"
                            data-ai-hint={firstImage.hint}
                        />
                    ) : (
                        <div className="aspect-[3/2] bg-muted flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">No Image</p>
                        </div>
                    )}
                  </Link>
                </div>
                <Link href={`/collections/${collectionData.id}/cards/${card.id}`} className="block p-4">
                  <Tooltip>
                    <TooltipTrigger className="text-left w-full">
                      <h3 className="font-semibold truncate group-hover:text-primary">{card.title}</h3>
                    </TooltipTrigger>
                    <TooltipContent>{card.title}</TooltipContent>
                  </Tooltip>
                  {card.description && (
                    <Tooltip>
                      <TooltipTrigger className="text-left w-full">
                         <p className="text-sm text-muted-foreground mt-1 truncate">{card.description}</p>
                      </TooltipTrigger>
                      <TooltipContent>{card.description}</TooltipContent>
                    </Tooltip>
                  )}
                  {collectionOwner?.username && (
                    <p className="text-xs text-muted-foreground mt-2">By {collectionOwner.username}</p>
                  )}
                </Link>
              </Card>
            )})}
            {isOwner && !hasReachedCardLimit && cards.length > 0 && (
              <Link href={`/collections/${collectionData.id}/add`} className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg hover:bg-muted transition-colors p-6 aspect-[3/2]">
                  <PlusCircle className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-semibold text-center">Add New Card</p>
              </Link>
            )}
          </div>
        </TooltipProvider>
       )}
    </div>
  );
}
