
// The homepage is now a client component to handle data fetching on the client-side,
// bypassing the server-side environment variable issues.
'use client';

import { HomePageClientContent } from './HomePageClientContent';
import type { SiteContent, Category, HowItWorksStep } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getSiteContent } from '@/app/actions/site-content';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

// This is now a Client Component that orchestrates fetching data.
export default function HomePage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch site content
        const siteContentData = await getSiteContent({ pageId: 'homePage' });
        setContent(siteContentData);

        // Fetch categories
        const catQuerySnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = catQuerySnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id } as Category;
        });
        setCategories(categoriesData);

      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading || !content) {
    return (
        <div className="container py-12 md:py-24 space-y-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                    <div className="flex gap-4">
                        <Skeleton className="h-12 w-40" />
                        <Skeleton className="h-12 w-40" />
                    </div>
                </div>
                <div>
                    <Skeleton className="aspect-video w-full" />
                </div>
            </div>
             <div className="text-center space-y-3 mb-12">
                <Skeleton className="h-10 w-1/3 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
             <div className="grid md:grid-cols-3 gap-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
  }

  const heroContent = content || {
    id: 'homePage',
    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
    imageHint: 'collection display'
  };

  const howItWorksSteps = content?.howItWorksSteps || [
    { icon: 'Edit3', title: 'Create Your Cards', description: 'Easily digitize your items with titles, descriptions, and photos.'},
    { icon: 'Database', title: 'Organize in Collections', description: 'Group your cards into themed collections. Keep them private or prepare them for the world to see.'},
    { icon: 'Share2', title: 'Share Your Passion', description: 'Publish your collections to our gallery, share them via a link, and connect with a community of fellow collectors.'},
  ];

  return (
    // The client component handles all interactivity and now receives the fetched data.
    <HomePageClientContent 
      initialContent={content} 
      initialCategories={categories}
      initialHowItWorksSteps={howItWorksSteps}
      initialHeroContent={heroContent}
    />
  );
}
