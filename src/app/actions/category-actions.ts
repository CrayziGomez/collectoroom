
'use server';

import { adminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';


export async function addCategory(input: { name: string; description: string }) {
  try {
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
