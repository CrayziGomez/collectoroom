
'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Share2, User, UserCheck, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Card as CardType, Collection, User as UserType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFollow } from "@/hooks/use-follow";

export default function CardDetailPage() {
    const params = useParams();
    const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
    const cardId = Array.isArray(params.cardId) ? params.cardId[0] : params.cardId;
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [cardData, setCardData] = useState<CardType | null>(null);
    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [collectionOwner, setCollectionOwner] = useState<UserType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { isFollowing, toggleFollow, isLoading: isFollowLoading, isProcessing: isFollowProcessing } = useFollow(collectionOwner?.uid || '');

    useEffect(() => {
        if (authLoading) return;
        
        const fetchCardAndCollection = async () => {
            if (!collectionId || !cardId) return;
            setIsLoading(true);

            try {
                // Fetch card
                const cardRef = doc(db, 'cards', cardId);
                const cardSnap = await getDoc(cardRef);

                if (!cardSnap.exists() || cardSnap.data().collectionId !== collectionId) {
                    notFound();
                    return;
                }
                const card = { ...cardSnap.data(), id: cardSnap.id } as CardType;
                setCardData(card);

                // Fetch collection
                const collectionRef = doc(db, 'collections', collectionId);
                const collectionSnap = await getDoc(collectionRef);
                
                if (!collectionSnap.exists()) {
                     notFound();
                     return;
                }
                const collection = { ...collectionSnap.data(), id: collectionSnap.id } as Collection;
                setCollectionData(collection);

                // Fetch collection owner
                if (collection.userId) {
                    const ownerRef = doc(db, 'users', collection.userId);
                    const ownerSnap = await getDoc(ownerRef);
                    if (ownerSnap.exists()) {
                        setCollectionOwner({...(ownerSnap.data() as UserType), uid: ownerSnap.id});
                    }
                }

                // Check permissions
                const isOwner = user?.uid === collection.userId;
                if (!collection.isPublic && !isOwner) {
                    router.push('/gallery');
                    return;
                }
                
            } catch (error) {
                console.error("Error fetching data:", error);
                notFound();
            } finally {
                setIsLoading(false);
            }
        };

        fetchCardAndCollection();

    }, [user, authLoading, collectionId, cardId, router]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({
            title: "Link Copied!",
            description: "The card link has been copied to your clipboard.",
        });
    };


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

    const isOwner = user?.uid === cardData.userId;
    const FollowButtonIcon = isFollowing ? UserCheck : UserPlus;

    return (
        <div className="container py-8">
            <div className="mb-6">
                <Button variant="ghost" asChild>
                    <Link href={`/collections/${collectionId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to "{collectionData.name}"
                    </Link>
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <Card className="overflow-hidden sticky top-24">
                        <Image
                            src={cardData.imageUrl}
                            alt={cardData.title}
                            width={600}
                            height={800}
                            className="w-full aspect-[3/4] object-cover"
                            data-ai-hint={cardData.imageHint}
                        />
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-4xl font-headline">{cardData.title}</CardTitle>
                            {collectionOwner && (
                                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            {collectionOwner.avatarUrl && <AvatarImage src={collectionOwner.avatarUrl} alt={collectionOwner.username} />}
                                            <AvatarFallback>{collectionOwner.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>By {collectionOwner.username}</span>
                                    </div>
                                    {!isOwner && user && (
                                        <Button variant="outline" size="sm" onClick={toggleFollow} disabled={isFollowLoading || isFollowProcessing} className="h-7 text-xs">
                                            {isFollowProcessing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <FollowButtonIcon className="mr-2 h-3 w-3" />}
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </Button>
                                    )}
                                </div>
                            )}
                            <CardDescription className="text-lg pt-4">{cardData.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <Separator />
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="font-semibold text-muted-foreground">Category</div>
                                <div>{cardData.category}</div>

                                <div className="font-semibold text-muted-foreground">Status</div>
                                <div><Badge variant="outline">{cardData.status}</Badge></div>
                             </div>
                             <Separator />
                             <div className="flex flex-wrap gap-2">
                              {isOwner && (
                                <Button asChild>
                                    <Link href={`/collections/${collectionId}/cards/${cardId}/edit`}>Edit Card Details</Link>
                                </Button>
                             )}
                              <Button variant="outline" onClick={handleShare}>
                                <Share2 className="mr-2 h-4 w-4" /> Share
                              </Button>
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
