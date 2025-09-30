
'use server';

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase'; // Use the client-side initialized app
import type { SiteContent } from '@/lib/types';

// IMPORTANT: This action now uses the client-side SDK via the server
// to avoid admin SDK initialization issues on page load.
const db = getFirestore(app);

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
    try {
        const docRef = doc(db, 'siteContent', input.pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure howItWorksSteps exists if it's the home page
            if (!data?.howItWorksSteps && input.pageId === 'homePage') {
                const updatedData = { ...data, howItWorksSteps: defaultHowItWorksSteps };
                 // This write might fail if rules aren't set, but the read has succeeded.
                await setDoc(docRef, updatedData, { merge: true }).catch(e => console.warn("Could not update site content with default steps:", e.message));
                return { id: docSnap.id, ...updatedData } as SiteContent;
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
             // If the document doesn't exist, create it for the homepage
             if (input.pageId === 'homePage') {
                const defaultContent: SiteContent = {
                    id: 'homePage',
                    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
                    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
                    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
                    imageHint: 'collection display',
                    howItWorksSteps: defaultHowItWorksSteps,
                };
                // This write might fail if rules aren't set, but we can still return the default content to render the page.
                await setDoc(doc(db, 'siteContent', 'homePage'), defaultContent).catch(e => console.warn("Could not create default site content:", e.message));
                return defaultContent;
            }
            return null;
        }
    } catch (error: any) {
        console.error("Critical Error in getSiteContent:", error);
        // Return a fallback object so the page can still render with an error message
         return {
            id: 'homePage',
            title: 'Error: Could not load page content.',
            description: `A critical server error occurred while trying to fetch page content. Please check your Firestore security rules to ensure the 'siteContent' collection is readable. Error: ${error.message}`,
            imageUrl: 'https://picsum.photos/seed/error/1200/600',
            imageHint: 'error illustration',
            howItWorksSteps: [],
        };
    }
}

// The admin-only update function still uses the admin SDK, which is fine
// as it's not called on page load.
import { adminDb } from '@/lib/firebase-admin';

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
