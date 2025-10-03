
'use server';

import type { SiteContent, HowItWorksStep } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { adminDb, adminStorage } from '@/lib/firebase-admin';


// --- Default Content Definitions ---
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

// --- Public Read Action ---
export async function getSiteContent(input: { pageId: string }): Promise<SiteContent> {
    try {
        const docRef = adminDb.collection('siteContent').doc(input.pageId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data() as SiteContent;
            if (!data.howItWorksSteps || data.howItWorksSteps.length === 0) {
                 await docRef.set({ howItWorksSteps: defaultHowItWorksSteps }, { merge: true });
                 return { id: docSnap.id, ...data, howItWorksSteps: defaultHowItWorksSteps };
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
            await docRef.set(defaultContent);
            return defaultContent;
        }
    } catch (error: any) {
        console.error("Critical Error in getSiteContent:", error);
        return {
           ...defaultContent,
           title: 'Error: Could Not Load Page Content',
           description: `There was a problem connecting to the database. Please verify your service account permissions. Original error: ${error.message}`,
        };
    }
}

// --- Admin Write Actions using Admin SDK ---
export async function updateSiteContent(formData: FormData): Promise<{ success: boolean; message: string; imageUrl?: string; }> {
  try {
    const id = formData.get('id') as string;
    const docRef = adminDb.collection('siteContent').doc(id);

    const updates: { [key:string]: any } = {};

    if (formData.has('title')) updates.title = formData.get('title');
    if (formData.has('description')) updates.description = formData.get('description');
    
    if (formData.has('howItWorksSteps')) {
      updates.howItWorksSteps = JSON.parse(formData.get('howItWorksSteps') as string);
    }
    
    let imageUrl: string | undefined;
    if (formData.has('imageFile')) {
      const imageFile = formData.get('imageFile') as File;
      const bucket = adminStorage.bucket();
      const imagePath = `site-content/homePage-hero-${Date.now()}`;
      const fileRef = bucket.file(imagePath);
      
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
      await fileRef.save(fileBuffer, { metadata: { contentType: imageFile.type } });
      
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '01-01-2100',
      });
      
      updates.imageUrl = signedUrl;
      imageUrl = signedUrl;
    }
    
    if (Object.keys(updates).length > 0) {
      await docRef.set(updates, { merge: true });
    }
    
    revalidatePath('/');

    return { success: true, message: 'Content updated successfully.', imageUrl };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return { success: false, message: `Update failed: ${error.message}` };
  }
}
