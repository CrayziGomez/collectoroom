'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';

// **FIXED: New function to delete a collection and decrement user\'s collection count**
export async function deleteCollection(input: { collectionId: string, userId: string }) {
    const { collectionId, userId } = input;
    
    if (!collectionId || !userId) {
        return { success: false, message: 'Missing collection or user ID.' };
    }

    try {
        const collectionRef = adminDb.collection('collections').doc(collectionId);
        const userRef = adminDb.collection('users').doc(userId);

        // Here, we should also delete all cards within the collection, but for now, we focus on the counts

        await adminDb.runTransaction(async (transaction) => {
            // Decrement the user\'s collection count
            transaction.update(userRef, { collectionCount: FieldValue.increment(-1) });
            transaction.delete(collectionRef);
        });

        revalidatePath('/');

        return { success: true };

    } catch (error: any) {
         console.error('Error deleting collection:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the collection.' };
    }
}

// **FIXED: New function to recount all of a user\'s cards and collections**
export async function recountUsage(userId: string) {
    if (!userId) {
        return { success: false, message: 'Missing user ID.' };
    }

    try {
        const userRef = adminDb.collection('users').doc(userId);
        const collectionsQuery = adminDb.collection('collections').where('userId', '==', userId);
        const cardsQuery = adminDb.collection('cards').where('userId', '==', userId);

        const [collectionsSnapshot, cardsSnapshot] = await Promise.all([
            collectionsQuery.get(),
            cardsQuery.get(),
        ]);

        const collectionCount = collectionsSnapshot.size;
        const cardCount = cardsSnapshot.size;

        await userRef.update({
            collectionCount,
            cardCount,
        });

        return { success: true, collectionCount, cardCount };

    } catch (error: any) {
        console.error('Error recounting usage:', error);
        return { success: false, message: error.message || 'An unknown error occurred while recounting usage.' };
    }
}
