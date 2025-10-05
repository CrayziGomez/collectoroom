'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Card as CardType, Collection } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Share2, Edit, Trash2, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast'; // Corrected import path
import Link from 'next/link';

interface CardPageProps {
    params: {
        id: string;
        cardId: string;
    };
}

export default function CardPage({ params }: CardPageProps) {
    const { id: collectionId, cardId } = params;
    const [cardData, setCardData] = useState<CardType | null>(null);
    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchCardAndCollection = async () => {
            if (authLoading) return;
            setIsLoading(true);

            try {
                // Fetch collection first to check for public status
                const collectionRef = doc(db, 'collections', collectionId);
                const collectionSnap = await getDoc(collectionRef);

                if (collectionSnap.exists()) {
                    const collection = { id: collectionSnap.id, ...collectionSnap.data() } as Collection;
                    setCollectionData(collection);

                    // Check permissions before fetching the card
                    const isOwner = user?.uid === collection.userId;
                    if (!collection.isPublic && !isOwner) {
                        toast({ title: "Access Denied", description: "This collection is private.", variant: "destructive" });
                        router.push('/gallery');
                        return;
                    }

                    // Now fetch the card
                    const cardRef = doc(db, 'cards', cardId);
                    const cardSnap = await getDoc(cardRef);

                    if (cardSnap.exists() && cardSnap.data().collectionId === collectionId) {
                        setCardData({ id: cardSnap.id, ...cardSnap.data() } as CardType);
                    } else {
                        notFound();
                    }
                } else {
                    notFound();
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ title: "Error", description: "Could not fetch card data. You may not have permission.", variant: "destructive" });
                // If there's any error (e.g. permission denied), redirect
                router.push('/gallery');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCardAndCollection();

    }, [user, authLoading, collectionId, cardId, router, toast]);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link Copied!",
                description: "The card link has been copied to your clipboard.",
            });
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
            toast({
                title: "Copy Failed",
                description: "Could not copy link to clipboard. Please copy it manually.",
                variant: "destructive",
            });
        }
    };

    const isOwner = useMemo(() => user?.uid === collectionData?.userId, [user, collectionData]);

    if (isLoading || authLoading) {
        return (
            <div className="container py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!cardData || !collectionData) {
        return null; 
    }

    return (
        <div className="container py-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-3xl font-bold">{cardData.title}</CardTitle>
                            <Link href={`/collections/${collectionId}`} className="text-sm text-muted-foreground hover:underline">
                                Part of {collectionData.name}
                            </Link>
                        </div>
                        <div className="flex items-center space-x-2">
                            {isOwner && (
                                <Link href={`/collections/${collectionId}/cards/${cardId}/edit`}>
                                    <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                                </Link>
                            )}
                            <Button variant="outline" size="icon" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                         <Badge variant={cardData.status === 'Mint' ? 'success' : 'secondary'}>{cardData.status}</Badge>
                        {collectionData.isPublic ? (
                            <Badge variant="outline"><Eye className="h-4 w-4 mr-1"/>Public</Badge>
                        ) : (
                            <Badge variant="outline"><EyeOff className="h-4 w-4 mr-1"/>Private</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                           <p className="text-muted-foreground whitespace-pre-wrap">{cardData.description}</p>
                        </div>
                        <div>
                            {cardData.images && cardData.images.length > 0 ? (
                               <Carousel className="w-full max-w-md mx-auto">
                                   <CarouselContent>
                                       {cardData.images.map((image, index) => (
                                            <CarouselItem key={index}>
                                               <div className="aspect-square relative">
                                                    <Image src={image.url} alt={`Card image ${index + 1}`} layout="fill" className="rounded-md object-cover"/>
                                                </div>
                                           </CarouselItem>
                                       ))}
                                   </CarouselContent>
                                   {cardData.images.length > 1 && (
                                        <>
                                            <CarouselPrevious />
                                            <CarouselNext />
                                        </>
                                    )}
                               </Carousel>
                            ) : (
                                <div className="text-center text-muted-foreground py-12">No images for this card.</div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                    Added on {new Date(cardData.createdAt).toLocaleDateString()}
                </CardFooter>
            </Card>
        </div>
    );
}
