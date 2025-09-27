
'use server';

import { adminDb } from '../../lib/firebase';
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

export async function getSiteContent(input: { pageId: string }): Promise<SiteContent | null> {
    if (!adminDb) {
      console.error('Firebase Admin SDK not initialized for getSiteContent.');
      // Return default content to prevent site crash
      return {
          id: 'homePage',
          title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
          description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
          imageUrl: 'https://picsum.photos/seed/hero/1200/600',
          imageHint: 'collection display',
      };
    }
    try {
        const docRef = adminDb.collection('siteContent').doc(input.pageId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() } as SiteContent;
        } else {
             if (input.pageId === 'homePage') {
                // Return default content if the document doesn't exist in Firestore
                const defaultContent: SiteContent = {
                    id: 'homePage',
                    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
                    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
                    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
                    imageHint: 'collection display',
                };
                // Optionally, save this default content to Firestore for future edits
                await adminDb.collection('siteContent').doc('homePage').set(defaultContent);
                return defaultContent;
            }
            return null;
        }
    } catch (error) {
        console.error("Error fetching site content:", error);
        // Return default content on error to prevent site crash
         return {
            id: 'homePage',
            title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
            description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
            imageUrl: 'https://picsum.photos/seed/hero/1200/600',
            imageHint: 'collection display',
        };
    }
}
