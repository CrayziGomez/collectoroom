
import type { Category } from '@/lib/types';
import { getSiteContent } from '@/app/actions/site-content';
import { HomePageClientContent } from './HomePageClientContent';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This is now a Server Component again. It fetches the initial data.
export default async function HomePage() {
  
  // Self-contained Firebase Admin initialization
  function initializeAdmin() {
    const alreadyCreated = getApps();
    if (alreadyCreated.length > 0) {
      const app = alreadyCreated[0];
      return { db: getFirestore(app) };
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    
    try {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
      const app = initializeApp({
        credential: cert(serviceAccount),
      });
      return { db: getFirestore(app) };
    } catch (error: any) {
      throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
  }
  
  const content = await getSiteContent({ pageId: 'homePage' });

  let categories: Category[] = [];
  try {
    const { db } = initializeAdmin();
    const catQuerySnapshot = await db.collection('categories').get();
    
    // Manually serialize Firestore Timestamps to strings
    categories = catQuerySnapshot.docs.map(doc => {
      const data = doc.data();
      const docId = doc.id;

      // Create a plain object and copy properties
      const plainObject: any = { id: docId };
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          if (value && typeof value.toDate === 'function') {
            // This is a Firestore Timestamp
            plainObject[key] = value.toDate().toISOString();
          } else {
            plainObject[key] = value;
          }
        }
      }
      return plainObject as Category;
    });

  } catch (error) {
    console.error("Error fetching categories on server:", error);
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
