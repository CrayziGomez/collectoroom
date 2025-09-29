
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { SiteContent } from '@/lib/types';


export async function updateSiteContent(input: any) {
  if (!adminDb) {
      return { success: false, message: 'Firebase Admin SDK not initialized.' };
  }
  try {
    const docRef = adminDb.collection('siteContent').doc(input.id);
    const { id, ...content } = input;
    await docRef.set(content, { merge: true });
    return { success: true, message: 'Content updated successfully.' };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return { success: false, message: `Update failed: ${error.message}` };
  }
}

const defaultHowItWorksSteps = [
    {
      icon: 'Edit3',
      title: 'Create Your Cards',
      description: 'Easily digitize your items with titles, descriptions, and photos.',
    },
    {
      icon: 'Database',
      title: 'Organize in Collections',
      description: 'Group your cards into themed collections. Keep them private or prepare them for the world to see.',
    },
    {
      icon: 'Share2',
      title: 'Share Your Passion',
      description: 'Publish your collections to our gallery, share them via a link, and connect with a community of fellow collectors.',
    },
];

export async function getSiteContent(input: { pageId: string }): Promise<SiteContent | null> {
    if (!adminDb) {
      // This is a diagnostic step. If this message appears on the homepage,
      // it confirms the Admin SDK is not initializing in the production environment.
      return {
          id: 'homePage',
          title: 'Initialization Error',
          description: 'The Firebase Admin SDK could not be initialized. This is likely due to an issue with the FIREBASE_SERVICE_ACCOUNT_KEY environment variable in your production environment. Please verify the secret in Secret Manager and App Hosting permissions.',
          imageUrl: 'https://picsum.photos/seed/error/1200/600',
          imageHint: 'error illustration',
          howItWorksSteps: [],
      };
    }
    try {
        const docRef = adminDb.collection('siteContent').doc(input.pageId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            // If howItWorksSteps is missing, add the default and update the document
            if (!data?.howItWorksSteps && input.pageId === 'homePage') {
                const updatedData = { ...data, howItWorksSteps: defaultHowItWorksSteps };
                await docRef.set(updatedData, { merge: true });
                return { id: docSnap.id, ...updatedData } as SiteContent;
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
             if (input.pageId === 'homePage') {
                const defaultContent: SiteContent = {
                    id: 'homePage',
                    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
                    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
                    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
                    imageHint: 'collection display',
                    howItWorksSteps: defaultHowItWorksSteps,
                };
                await adminDb.collection('siteContent').doc('homePage').set(defaultContent);
                return defaultContent;
            }
            return null;
        }
    } catch (error: any) {
        console.error("Error fetching site content:", error);
         return {
            id: 'homePage',
            title: 'Data Fetch Error',
            description: `Failed to fetch content from Firestore. Error: ${error.message}`,
            imageUrl: 'https://picsum.photos/seed/error/1200/600',
            imageHint: 'error illustration',
            howItWorksSteps: [],
        };
    }
}
