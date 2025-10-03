'use server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

import { adminDb } from '@/lib/firebase-admin';

// Helper to map icon string to a static path
function getIconPath(iconName: string): string {
    const iconMap = {
        'Layers3': '/icons/layers.svg',
        'Gem': '/icons/gem.svg',
        'Trophy': '/icons/trophy.svg',
        'Ticket': '/icons/ticket.svg',
        'Palette': '/icons/palette.svg',
        'BookOpen': '/icons/book-open.svg',
        'Music': '/icons/music.svg',
        'Camera': '/icons/camera.svg',
    };
    return iconMap[iconName] || '/icons/default.svg';
}

export async function createCategory(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const categoryRef = adminDb.collection('categories').doc();
        await categoryRef.set({
            name,
            description: description || '',
            icon: 'Layers3', // default icon name
            createdAt: FieldValue.serverTimestamp(),
        });

        revalidatePath('/');
        revalidatePath('/admin');

        return { success: true, categoryId: categoryRef.id };

    } catch (error: any) {
        console.error('Error creating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the category.' };
    }
}

export async function getCategories() {
    try {
        const categoriesSnapshot = await adminDb.collection('categories').orderBy('name').get();
        const categories = categoriesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                description: data.description,
                icon: getIconPath(data.icon), // Map icon name to path
            };
        });
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

    if (!categoryId) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        // Check if any collection is using this category
        const collectionsSnapshot = await adminDb.collection('collections')
            .where('category', '==', categoryId)
            .limit(1)
            .get();

        if (!collectionsSnapshot.empty) {
            return { success: false, message: 'Cannot delete category with active collections. Please reassign them first.' };
        }

        const categoryRef = adminDb.collection('categories').doc(categoryId);
        await categoryRef.delete();

        revalidatePath('/');
        revalidatePath('/admin');

        return { success: true };

    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the category.' };
    }
}
