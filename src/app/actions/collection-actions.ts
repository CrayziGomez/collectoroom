'use server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';

export async function createCollection(formData: FormData) {
    const name = formData.get('name') as string;
    const userId = formData.get('userId') as string;
    const category = formData.get('category') as string;

    if (!name || !userId || !category) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const collectionRef = adminDb.collection('collections').doc();
        await collectionRef.set({
            name,
            userId,
            category,
            cardCount: 0,
            coverImage: '', // Default cover image
            createdAt: FieldValue.serverTimestamp(),
        });

        revalidatePath('/'); // Revalidate the home page to show the new collection

        return { success: true, collectionId: collectionRef.id };

    } catch (error: any) {
        console.error('Error creating collection:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the collection.' };
    }
}
