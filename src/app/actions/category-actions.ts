'use server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

import { adminDb } from '@/lib/firebase-admin';

export async function createCategory(formData: FormData) {
    const name = formData.get('name') as string;
    const userId = formData.get('userId') as string;

    if (!name || !userId) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const categoryRef = adminDb.collection('users').doc(userId).collection('categories').doc();
        await categoryRef.set({
            name,
            cardCount: 0,
            createdAt: FieldValue.serverTimestamp(),
        });

        revalidatePath('/'); // Revalidate the home page to show the new category

        return { success: true, categoryId: categoryRef.id };

    } catch (error: any) {
        console.error('Error creating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the category.' };
    }
}

export async function getCategories(userId: string) {
    try {
        const categoriesSnapshot = await adminDb.collection('users').doc(userId).collection('categories').orderBy('createdAt', 'asc').get();
        const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, categories };
    } catch (error: any) {
        console.error('Error getting categories:', error);
        return { success: false, message: error.message || 'An unknown error occurred while getting categories.' };
    }
}

export async function updateCategory(formData: FormData) {
    const categoryId = formData.get('categoryId') as string;
    const name = formData.get('name') as string;
    const userId = formData.get('userId') as string;

    if (!categoryId || !name || !userId) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const categoryRef = adminDb.collection('users').doc(userId).collection('categories').doc(categoryId);
        await categoryRef.update({ name });

        revalidatePath('/');

        return { success: true };

    } catch (error: any) {
        console.error('Error updating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while updating the category.' };
    }
}

export async function deleteCategory(formData: FormData) {
    const categoryId = formData.get('categoryId') as string;
    const userId = formData.get('userId') as string;

    if (!categoryId || !userId) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        // First, check if there are any collections associated with this category
        const collectionsSnapshot = await adminDb.collection('collections')
            .where('userId', '==', userId)
            .where('category', '==', categoryId)
            .limit(1)
            .get();

        if (!collectionsSnapshot.empty) {
            return { success: false, message: 'Cannot delete category with active collections. Please reassign them first.' };
        }

        const categoryRef = adminDb.collection('users').doc(userId).collection('categories').doc(categoryId);
        await categoryRef.delete();

        revalidatePath('/');

        return { success: true };

    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the category.' };
    }
}
