
'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { initializeAdmin } from '@/lib/firebase-admin';

export async function addCategory(input: { name: string; description: string }) {
  const { db } = await initializeAdmin();

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

    return { success: true, message: `Category "${name}" added successfully.` };
  } catch (error: any) {
    console.error('Error adding category:', error);
    return { success: false, message: `Failed to add category: ${error.message}` };
  }
}

export async function deleteCategory(input: { categoryId: string }) {
    const { db } = await initializeAdmin();
    const { categoryId } = input;

    try {
        if (!categoryId) {
            throw new Error('Category ID is required.');
        }

        const categoryRef = db.collection('categories').doc(categoryId);
        await categoryRef.delete();

        return { success: true, message: 'Category deleted successfully.' };
    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, message: `Failed to delete category: ${error.message}` };
    }
}
