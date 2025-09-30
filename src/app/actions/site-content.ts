
'use server';

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase'; // Use the client-side initialized app
import type { SiteContent, HowItWorksStep } from '@/lib/types';
import { adminDb } from '@/lib/firebase-admin';

// IMPORTANT: getSiteContent now uses the client-side SDK via the server
// to avoid admin SDK initialization issues on page load. updateSiteContent (admin-only)
// still uses the admin SDK.
const db = getFirestore(app);

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
            // Return a fallback for any other page to prevent crashes
            return { id: input.pageId, title: 'Page Content', description: '...' };
        }

        const docRef = doc(db, 'siteContent', input.pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as SiteContent;
            // Ensure howItWorksSteps exists if it's the home page
            if (!data.howItWorksSteps || data.howItWorksSteps.length === 0) {
                 return { id: docSnap.id, ...data, howItWorksSteps: defaultHowItWorksSteps };
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
            // If the document doesn't exist, create it for the homepage
            await setDoc(doc(db, 'siteContent', 'homePage'), defaultContent).catch(e => {
                console.warn("Could not create default site content due to permissions:", e.message);
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
