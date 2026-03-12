"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from '@clerk/nextjs';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CardClient({ card, collection }: any) {
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);

  const firstImage = card.images && card.images[0];

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">{card.title}</h1>
            <p className="text-muted-foreground">In <Link href={`/collections/${collection.id}`} className="underline">{collection.title}</Link></p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost">Share</Button>
            <Button variant="ghost">Report</Button>
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="relative aspect-square w-full bg-muted rounded-md overflow-hidden">
                {firstImage ? (
                  <Image src={firstImage.url} alt={card.title} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No image</div>
                )}
              </div>
            </div>
            <div className="md:col-span-2 grid gap-4">
              <div className="flex items-center gap-2">
                <Badge>{card.status}</Badge>
                <div className="text-sm text-muted-foreground">{card.createdAt && new Date(card.createdAt).toLocaleString()}</div>
              </div>
              <div className="prose max-w-none">{card.description}</div>
              <div className="flex gap-2">
                <Button onClick={() => { if (!isSignedIn) return window.location.href = '/'; setLiked(!liked); toast({ title: liked ? 'Removed Like' : 'Liked' }); }}>{liked ? 'Unlike' : 'Like'}</Button>
                <Link href={`/collections/${collection.id}/cards/${card.id}/edit`} className="inline-block"><Button>Edit</Button></Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
"use client";

import { Button } from '@/components/ui/button';
import { Share2, Edit } from 'lucide-react';
import { Card as UICard, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function CardClient({ card, collection, isOwner }: any) {
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link Copied!', description: 'The card link has been copied to your clipboard.' });
    } catch (e) {
      toast({ title: 'Copy Failed', description: 'Could not copy link to clipboard.', variant: 'destructive' });
    }
  };

  return (
    <div className="container py-8">
      <UICard>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">{card.title}</CardTitle>
              <Link href={`/collections/${collection.id}`} className="text-sm text-muted-foreground hover:underline">Part of {collection.name}</Link>
            </div>
            <div className="flex items-center space-x-2">
              {isOwner && (
                <Link href={`/collections/${collection.id}/cards/${card.id}/edit`}>
                  <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                </Link>
              )}
              <Button variant="outline" size="icon" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Badge variant={card.status === 'Mint' ? 'success' : 'secondary'}>{card.status}</Badge>
            {collection.isPublic ? (
              <Badge variant="outline">Public</Badge>
            ) : (
              <Badge variant="outline">Private</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-muted-foreground whitespace-pre-wrap">{card.description}</p>
            </div>
            <div>
              {card.images && card.images.length > 0 ? (
                <Carousel className="w-full max-w-md mx-auto">
                  <CarouselContent>
                    {card.images.map((image: any, idx: number) => (
                      <CarouselItem key={idx}>
                        <div className="aspect-square relative"><Image src={image.url} alt={`Card image ${idx + 1}`} fill className="rounded-md object-cover" /></div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {card.images.length > 1 && (<><CarouselPrevious /><CarouselNext /></>)}
                </Carousel>
              ) : (
                <div className="text-center text-muted-foreground py-12">No images for this card.</div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">Added on {new Date(card.createdAt).toLocaleDateString()}</CardFooter>
      </UICard>
    </div>
  );
}
