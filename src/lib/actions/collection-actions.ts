'use server';

import { adminDb as db } from '@/lib/firebase-admin'; // Corrected import path and name
import { auth } from 'firebase-admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Toggles the isPublic flag for a given collection.
 * This is a server action and must be called from the server or a client component.
 * It includes a security check to ensure that only the owner of the collection can modify it.
 */
export const toggleCollectionPrivacy = async (collectionId: string, newPrivacyState: boolean): Promise<{ success: boolean; error?: string }> => {
    const sessionCookie = cookies().get('__session') ?.value || '';

    // Authenticate the user
    let decodedToken;
    try {
        decodedToken = await auth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
    } catch (error) {
        console.error("Authentication error:", error);
        return { success: false, error: 'You must be logged in to perform this action.' };
    }

    const userId = decodedToken.uid;

    if (!collectionId || typeof newPrivacyState !== 'boolean') {
        return { success: false, error: 'Invalid arguments provided.' };
    }

    try {
        const collectionRef = db.collection('collections').doc(collectionId);
        const collectionDoc = await collectionRef.get();

        if (!collectionDoc.exists) {
            return { success: false, error: 'Collection not found.' };
        }

        // Security Check: Ensure the user making the request owns the collection.
        if (collectionDoc.data()?.userId !== userId) {
             return { success: false, error: 'You do not have permission to modify this collection.' };
        }

        // Update the document in Firestore
        await collectionRef.update({
            isPublic: newPrivacyState
        });

        // Revalidate the paths that display this collection data.
        // This tells Next.js to re-render these pages on the next visit.
        revalidatePath(`/collections/${collectionId}`);
        revalidatePath('/gallery');
        revalidatePath('/my-collectoroom'); // Also revalidate user's personal page

        return { success: true };

    } catch (error) {
        console.error('Error toggling collection privacy:', error);
        // In case of a database error, return a generic error message.
        return { success: false, error: 'An unexpected error occurred while updating the collection.' };
    }
};
