
'use server';

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getClientApp } from '@/lib/firebase'; // Use the universal initializer
import type { SiteContent, HowItWorksStep } from '@/lib/types';
import { adminDb } from '@/lib/firebase-admin';

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
        if (input.pageId !== 'homePage') {
            return { id: input.pageId, title: 'Page Content', description: '...' };
        }
        
        // Initialize the app and Firestore on the server correctly
        const app = getClientApp();
        const db = getFirestore(app);

        const docRef = doc(db, 'siteContent', input.pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as SiteContent;
            if (!data.howItWorksSteps || data.howItWorksSteps.length === 0) {
                 return { id: docSnap.id, ...data, howItWorksSteps: defaultHowItWorksSteps };
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
            // Attempt to create the document with public rules. This might fail if rules
            // are restrictive, but the page will still render with default content.
            await setDoc(doc(db, 'siteContent', 'homePage'), defaultContent).catch(e => {
                console.warn("Could not create default site content, likely due to Firestore security rules. This is non-critical.", e.message);
            });
            return defaultContent;
        }
    } catch (error: any) {
        console.error("Critical Error in getSiteContent. Returning default content.", error);
        // Return a fallback object so the page can still render with an error message
        const errorContent = {
           ...defaultContent,
           title: 'Error: Could Not Load Page Content',
           description: `There was a problem connecting to the database. Please check your Firestore security rules. Error: ${error.message}`,
        };
        return errorContent;
    }
}


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
