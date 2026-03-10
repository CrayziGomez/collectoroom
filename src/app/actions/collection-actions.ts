'use server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { getUser } from './user-actions'; // Import the user-actions

export async function createCollection(formData: FormData) {
    const name = formData.get('name') as string;
    const userId = formData.get('userId') as string;
    const category = formData.get('category') as string;

    if (!name || !userId || !category) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        // **FIXED: Add user plan limit check**
        const user = await getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.collectionCount >= user.plan.collectionLimit) {
            return { 
                success: false, 
                message: `You\'ve reached your limit of ${user.plan.collectionLimit} collections. Please upgrade your plan.` 
            };
        }

        const collectionRef = adminDb.collection('collections').doc();
        const userRef = adminDb.collection('users').doc(userId);

        // Use a transaction to ensure atomic update
        await adminDb.runTransaction(async (transaction) => {
            transaction.set(collectionRef, {
                name,
                userId,
                category,
                cardCount: 0,
                coverImage: '', // Default cover image
                createdAt: FieldValue.serverTimestamp(),
            });

            // Atomically increment the user's collection count
            transaction.update(userRef, { collectionCount: FieldValue.increment(1) });
        });

        revalidatePath('/'); // Revalidate the home page to show the new collection

        return { success: true, collectionId: collectionRef.id };

    } catch (error: any) {
        console.error('Error creating collection:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the collection.' };
    }
}
