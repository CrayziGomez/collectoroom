
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

let adminApp: App;
let adminDb: Firestore;

function getAdminInstances() {
  if (getApps().length === 0) {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    const serviceAccount = JSON.parse(serviceAccountString);
    // The private_key in the service account JSON often has its newlines
    // escaped when stored in an environment variable (e.g., `\n` becomes `\\n`).
    // We need to replace these escaped newlines with actual newline characters.
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    adminApp = getApps()[0];
  }
  adminDb = getFirestore(adminApp);
  return { adminDb };
}


export async function addCategory(input: { name: string; description: string }) {
  try {
    const { adminDb } = getAdminInstances();
    const { name, description } = input;

    if (!name) {
      throw new Error('Category name is required.');
    }

    const categoryRef = adminDb.collection('categories').doc();
    await categoryRef.set({
      name,
      description,
      icon: 'Layers3', // Default icon
      createdAt: FieldValue.serverTimestamp(),
    });

    // Revalidate paths where categories are used
    revalidatePath('/admin');
    revalidatePath('/gallery');
    revalidatePath('/my-collectoroom/create');
    // Add any other paths that need revalidation

    return { success: true, message: `Category "${name}" added successfully.` };
  } catch (error: any) {
    console.error('Error adding category:', error);
    return { success: false, message: `Failed to add category: ${error.message}` };
  }
}
