
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Database, Edit3, Share2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import type { Category } from '@/lib/types';
import { getSiteContent } from '@/app/actions/site-content';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HomePageClientContent } from './HomePageClientContent';

// This is now a Server Component again. It fetches the initial data.
export default async function HomePage() {
  
  // Fetch initial content on the server.
  // The getSiteContent action is now robust and will return default content on failure.
  const content = await getSiteContent({ pageId: 'homePage' });

  // Fetch categories on the server.
  // We'll wrap this in a try-catch to prevent site crashes if Firestore fails here.
  let categories: Category[] = [];
  try {
    const catQuerySnapshot = await getDocs(collection(db, 'categories'));
    categories = catQuerySnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Category);
  } catch (error) {
    console.error("Error fetching categories on server:", error);
    // Categories will be an empty array, the page will still render.
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
    // The client component handles all interactivity (dialogs, etc.)
    <HomePageClientContent 
      initialContent={content} 
      initialCategories={categories}
      initialHowItWorksSteps={howItWorksSteps}
      initialHeroContent={heroContent}
    />
  );
}
