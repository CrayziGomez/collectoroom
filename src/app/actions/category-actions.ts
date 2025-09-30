
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

function initializeScopedAdminApp() {
    const appName = 'scoped-category-actions-app';
    const existingApp = getApps().find(app => app.name === appName);
    if (existingApp) {
        return existingApp;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    }
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
    return initializeApp({
        credential: cert(serviceAccount)
    }, appName);
}


export async function addCategory(input: { name: string; description: string }) {
  const app = initializeScopedAdminApp();
  const db = getFirestore(app);

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
