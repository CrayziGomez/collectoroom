
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Category } from '@/lib/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export async function getCategories(): Promise<Category[]> {
  try {
    // Removed .orderBy('createdAt', 'asc') to ensure all categories are returned,
    // as older categories may not have the 'createdAt' field.
    const categoriesSnapshot = await adminDb.collection('categories').get();
    
    if (categoriesSnapshot.empty) {
      return [];
    }

    const categories = categoriesSnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt as Timestamp;
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        icon: data.icon,
        // Handle cases where createdAt might not exist on older documents
        createdAt: createdAt ? createdAt.toDate().toISOString() : new Date(0).toISOString(),
      } as Category;
    });

    // Optional: If consistent ordering is desired, sort in the application code.
    // This is safer than a query-based sort that might filter results.
    categories.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return []; 
  }
}

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
    
    revalidatePath('/');

    return { success: true, message: `Category "${name}" added successfully.` };
  } catch (error: any) {
    console.error('Error adding category:', error);
    return { success: false, message: `Failed to add category: ${error.message}` };
  }
}

export async function deleteCategory(categoryId: string) {
    try {
        if (!categoryId) {
            throw new Error('Category ID is required.');
        }

        const categoryRef = adminDb.collection('categories').doc(categoryId);
        await categoryRef.delete();
        
        revalidatePath('/');

        return { success: true, message: 'Category deleted successfully.' };
    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, message: `Failed to delete category: ${error.message}` };
    }
}
