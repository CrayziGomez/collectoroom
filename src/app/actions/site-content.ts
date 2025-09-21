
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAdminInstances } from '@/lib/firebase-admin';
import type { SiteContent } from '@/lib/types';


export async function updateSiteContent(input: any) {
  try {
    const { adminDb } = getAdminInstances();
    const docRef = doc(adminDb, 'siteContent', input.id);
    const { id, ...content } = input;
    await setDoc(docRef, content, { merge: true });
    return { success: true, message: 'Content updated successfully.' };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return { success: false, message: `Update failed: ${error.message}` };
  }
}

export async function getSiteContent(input: { pageId: string }): Promise<SiteContent | null> {
    try {
        const { adminDb } = getAdminInstances();
        const docRef = doc(adminDb, 'siteContent', input.pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as SiteContent;
        } else {
             if (input.pageId === 'homePage') {
                return {
                    id: 'homePage',
                    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
                    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
                    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
                    imageHint: 'collection display',
                };
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
