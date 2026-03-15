"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Loader2, Crown, Pencil, Share2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import FollowButton from '../../profile/FollowButton';
import MessageButton from '../../profile/MessageButton';
import { useUser } from '@clerk/nextjs';
import { tierLimits } from '@/lib/constants';
import { toggleCollectionPrivacy } from '@/app/actions/collection-actions';

export default function CollectionClient({ initialCollection, initialOwner, initialCards }: any) {
  const { isSignedIn, user } = useUser();
  const [collection, setCollection] = useState(initialCollection);
  const [owner] = useState(initialOwner);
  const [cards] = useState(initialCards || []);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);

  const isOwner = isSignedIn && user?.id === collection.userId;

  const userTier = (user && (user.publicMetadata as any)?.tier) || 'Hobbyist';
  const cardLimit = tierLimits[userTier]?.cards ?? 0;
  const hasReachedCardLimit = isOwner ? (collection.cardCount || 0) >= cardLimit : false;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // silent success
    } catch (e) {
      // ignore
    }
  };

  const handleTogglePrivacy = async () => {
    setIsPrivacyLoading(true);
    try {
      await toggleCollectionPrivacy(collection.id, !collection.isPublic);
      setCollection({ ...collection, isPublic: !collection.isPublic });
    } catch (e) {
      console.error('Failed to toggle privacy', e);
    } finally {
      setIsPrivacyLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{collection.category}</Badge>
              {collection.isPublic ? (
                <Badge variant="outline"><Eye className="h-4 w-4 mr-1"/>Public</Badge>
              ) : (
                <Badge variant="outline"><EyeOff className="h-4 w-4 mr-1"/>Private</Badge>
              )}
            </div>
            <h1 className="text-4xl font-bold font-headline">{collection.name}</h1>
            <p className="text-lg text-muted-foreground mt-2 max-w-2xl">{collection.description}</p>
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                {owner?.avatarUrl && <AvatarImage src={owner.avatarUrl} alt={owner?.username} />}
                <AvatarFallback>{owner?.username?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>By {owner?.username || 'Unknown User'}</span>
              <span>·</span>
              <span>{cards.length} cards</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isOwner ? (
              <>
                <Button variant="outline" onClick={handleTogglePrivacy} disabled={isPrivacyLoading}>
                  {isPrivacyLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : (collection.isPublic ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>)}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/collections/${collection.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button asChild disabled={hasReachedCardLimit}>
                  <Link href={`/collections/${collection.id}/add`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Card
                  </Link>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {owner?.id && <FollowButton targetUserId={owner.id} />}
                {owner?.id && <MessageButton otherUserId={owner.id} />}
              </div>
            )}
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>This collection is empty.</p>
          {isOwner && !hasReachedCardLimit && (
            <Button asChild className="mt-4">
              <Link href={`/collections/${collection.id}/add`}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add your first card
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cards.map((card: any) => {
              const firstImage = card.images && card.images.length > 0 ? card.images[0] : null;
              return (
                <Card key={card.id} className="overflow-hidden group">
                  <div className="relative">
                    {isOwner && (
                      <Link href={`/collections/${collection.id}/cards/${card.id}/edit`} className="absolute top-2 right-2 z-10">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Link href={`/collections/${collection.id}/cards/${card.id}`}>
                      {firstImage ? (
                        <Image src={firstImage.url} alt={card.title} width={300} height={200} className="aspect-[3/2] object-cover w-full group-hover:scale-105 transition-transform duration-300" data-ai-hint={firstImage.hint} />
                      ) : (
                        <div className="aspect-[3/2] bg-muted flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">No Image</p>
                        </div>
                      )}
                    </Link>
                  </div>
                  <Link href={`/collections/${collection.id}/cards/${card.id}`} className="block p-4">
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
                    {owner?.username && <p className="text-xs text-muted-foreground mt-2">By {owner.username}</p>}
                  </Link>
                </Card>
              );
            })}
            {isOwner && !hasReachedCardLimit && cards.length > 0 && (
              <Link href={`/collections/${collection.id}/add`} className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg hover:bg-muted transition-colors p-6 aspect-[3/2]">
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
