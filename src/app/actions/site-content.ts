
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import type { SiteContent, HowItWorksStep } from '@/lib/types';

// Self-contained Firebase Admin initialization
function initializeAdminApp(): { db: Firestore; storage: Storage } {
  const alreadyCreated = getApps();
  if (alreadyCreated.length > 0) {
    const app = alreadyCreated[0];
    return { db: getFirestore(app), storage: getStorage(app) };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountString.trim());
  } catch (error: any) {
    const preview = serviceAccountString.substring(0, 20);
    throw new Error(`Failed to parse service account JSON. The string starts with: "${preview}". Full string length is ${serviceAccountString.length}. Please verify the secret's format in your hosting environment. Original error: ${error.message}`);
  }

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return { db: getFirestore(app), storage: getStorage(app) };
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

const defaultHowItWorksSteps: HowItWorksStep[] = [
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

const defaultContent: SiteContent = {
    id: 'homePage',
    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
    imageHint: 'collection display',
    howItWorksSteps: defaultHowItWorksSteps,
};

export async function getSiteContent(input: { pageId: string }): Promise<SiteContent> {
    try {
        const { db } = initializeAdminApp();
        const docRef = db.collection('siteContent').doc(input.pageId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data() as SiteContent;
            // Ensure howItWorksSteps exists, if not, add it and return the merged data
            if (!data.howItWorksSteps || data.howItWorksSteps.length === 0) {
                 await docRef.set({ howItWorksSteps: defaultHowItWorksSteps }, { merge: true });
                 return { id: docSnap.id, ...data, howItWorksSteps: defaultHowItWorksSteps };
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
            // Document doesn't exist, create it
            const { db: adminDb } = initializeAdminApp();
            await adminDb.collection('siteContent').doc(input.pageId).set(defaultContent);
            return defaultContent;
        }
    } catch (error: any) {
        console.error("Critical Error in getSiteContent:", error);
        // Return default content with an error message to prevent site crash
        return {
           ...defaultContent,
           title: 'Error: Could Not Load Page Content',
           description: `There was a problem connecting to the database. Please check your service account permissions. Original error: ${error.message}`,
        };
    }
}


export async function updateSiteContent(input: any) {
  try {
    const { db } = initializeAdminApp();
    const docRef = db.collection('siteContent').doc(input.id);
    const { id, ...content } = input;
    await docRef.set(content, { merge: true });
    return { success: true, message: 'Content updated successfully.' };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return { success: false, message: `Update failed: ${error.message}` };
  }
}
