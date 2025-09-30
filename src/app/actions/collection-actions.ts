
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Self-contained Firebase Admin initialization
function initializeAdmin() {
  const alreadyCreated = getApps();
  if (alreadyCreated.length > 0) {
    return { db: getFirestore(alreadyCreated[0]) };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  let serviceAccount;
  try {
    const decodedString = Buffer.from(serviceAccountString, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decodedString);
  } catch (error: any) {
    if (error.message.includes("Unexpected token")) {
       throw new Error(`Failed to parse decoded service account JSON. The decoded string is not valid JSON. Original error: ${error.message}`);
    }
    throw new Error(`Failed to decode FIREBASE_SERVICE_ACCOUNT_KEY from Base64. Make sure it is a valid Base64-encoded string. Original error: ${error.message}`);
  }
  
  try {
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    return { db: getFirestore(app) };
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

export async function createCollection(formData: FormData) {
    const { db } = initializeAdmin();

    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const keywords = formData.get('keywords') as string;
    const category = formData.get('category') as string;
    const isPublic = formData.get('isPublic') === 'true';

    const coverImage = '/images/CR_Logo_Gry.png';
    const coverImageHint = 'CollectoRoom logo';

    if (!userId || !name || !category) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const collectionId = db.collection('collections').doc().id;

        await db.collection('collections').doc(collectionId).set({
            userId,
            name,
            description,
            keywords,
            category,
            isPublic,
            coverImage: coverImage,
            coverImageHint,
            cardCount: 0,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        revalidatePath('/my-collectoroom');
        revalidatePath('/gallery');
        
        return { success: true, message: 'Collection created!', collectionId };

    } catch (error: any) {
        console.error("Error creating collection:", error);
        return { success: false, message: error.message || 'Failed to create collection.' };
    }
}
