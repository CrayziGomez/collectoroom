
'use server';

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getClientApp } from '@/lib/firebase';
import type { SiteContent, HowItWorksStep } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This action now uses the CLIENT Firestore instance for reads.
function getDb() {
  return getFirestore(getClientApp());
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
        const db = getDb();
        const docRef = doc(db, 'siteContent', input.pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as SiteContent;
            // Ensure howItWorksSteps exists, if not, add it and return the merged data
            if (!data.howItWorksSteps || data.howItWorksSteps.length === 0) {
                 await setDoc(docRef, { howItWorksSteps: defaultHowItWorksSteps }, { merge: true });
                 return { id: docSnap.id, ...data, howItWorksSteps: defaultHowItWorksSteps };
            }
            return { id: docSnap.id, ...data } as SiteContent;
        } else {
            // Document doesn't exist, create it
            await setDoc(doc(db, 'siteContent', input.pageId), defaultContent);
            return defaultContent;
        }
    } catch (error: any) {
        console.error("Critical Error in getSiteContent:", error);
        // Return default content with an error message to prevent site crash
        return {
           ...defaultContent,
           title: 'Error: Could Not Load Page Content',
           description: `There was a problem connecting to the database. Please verify your service account permissions. Original error: ${error.message}`,
        };
    }
}

// updateSiteContent MUST remain a server action that uses the Admin SDK to bypass security rules.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function initializeAdmin() {
  const alreadyCreated = getApps();
  if (alreadyCreated.length > 0) {
    const app = alreadyCreated[0];
    return { db: getAdminFirestore(app), storage: getStorage(app) };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountString);
  } catch (error: any) {
    const preview = serviceAccountString.substring(0, 20);
    throw new Error(`Failed to parse service account JSON. The string starts with: "${preview}". Full string length is ${serviceAccountString.length}. Please verify the secret's format in your hosting environment. Original error: ${error.message}`);
  }

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: 'studio-7145415565-66e7d.appspot.com',
    });
    return { db: getAdminFirestore(app), storage: getStorage(app) };
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

export async function updateSiteContent(formData: FormData): Promise<{ success: boolean; message: string; imageUrl?: string; }> {
  try {
    const { db } = initializeAdmin();
    const id = formData.get('id') as string;
    const docRef = db.collection('siteContent').doc(id);

    const updates: { [key: string]: any } = {};

    // Handle text updates
    if (formData.has('title')) updates.title = formData.get('title');
    if (formData.has('description')) updates.description = formData.get('description');
    
    // Handle "How It Works" steps updates
    if (formData.has('howItWorksSteps')) {
      updates.howItWorksSteps = JSON.parse(formData.get('howItWorksSteps') as string);
    }
    
    // Handle image upload
    let imageUrl: string | undefined;
    if (formData.has('imageFile')) {
      const { storage } = initializeAdmin();
      const imageFile = formData.get('imageFile') as File;
      const bucket = storage.bucket();
      const imagePath = `site-content/homePage-hero-${Date.now()}`;
      const fileRef = bucket.file(imagePath);
      
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
      await fileRef.save(fileBuffer, { metadata: { contentType: imageFile.type } });
      
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '01-01-2100', // Far-future expiration date
      });
      
      updates.imageUrl = signedUrl;
      imageUrl = signedUrl; // To return to the client
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
