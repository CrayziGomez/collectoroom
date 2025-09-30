
'use server';

import type { SiteContent, HowItWorksStep } from '@/lib/types';
import { initializeAdminApp } from '@/lib/firebase-admin';

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
        
        if (input.pageId !== 'homePage') {
            return { id: input.pageId, title: 'Page Content', description: '...' };
        }
        
        const docRef = db.collection('siteContent').doc(input.pageId);
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            const data = docSnap.data() as SiteContent;
            if (!data.howItWorksSteps || data.howItWorksSteps.length === 0) {
                 await docRef.set({ howItWorksSteps: defaultHowItWorksSteps }, { merge: true });
                 return { id: docSnap.id, ...data, howItWorksSteps: defaultHowItWorksSteps };
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
            await db.collection('siteContent').doc('homePage').set(defaultContent);
            return defaultContent;
        }
    } catch (error: any) {
        console.error("Critical Error in getSiteContent. Returning default content.", error);
        return {
           ...defaultContent,
           title: 'Error: Could Not Load Page Content',
           description: `There was a problem connecting to the database. Please check your service account permissions. Original error: ${error.message}`,
        };
    }
}


export async function updateSiteContent(input: any) {
  let db;
  try {
      db = initializeAdminApp().db;
  } catch (error) {
      return { success: false, message: 'Failed to initialize Firebase Admin SDK.' };
  }

  try {
    const docRef = db.collection('siteContent').doc(input.id);
    const { id, ...content } = input;
    await docRef.set(content, { merge: true });
    return { success: true, message: 'Content updated successfully.' };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return { success: false, message: `Update failed: ${error.message}` };
  }
}
