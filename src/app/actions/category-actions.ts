
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

export async function addCategory(input: { name: string; description: string }) {
  const { db } = initializeAdmin();

  try {
    const { name, description } = input;

    if (!name) {
      throw new Error('Category name is required.');
    }

    const categoryRef = db.collection('categories').doc();
    await categoryRef.set({
      name,
      description,
      icon: 'Layers3', // Default icon
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/admin');
    revalidatePath('/gallery');
    revalidatePath('/my-collectoroom/create');

    return { success: true, message: `Category "${name}" added successfully.` };
  } catch (error: any) {
    console.error('Error adding category:', error);
    return { success: false, message: `Failed to add category: ${error.message}` };
  }
}
