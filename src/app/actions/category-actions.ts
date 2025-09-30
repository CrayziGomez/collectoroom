
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
  
  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    return { db: getFirestore(app) };
  } catch (error: any) {
    if (error.code === 'SyntaxError') {
       throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid, Base64-encoded JSON string. Original error: ${error.message}`);
    }
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
