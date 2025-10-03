'use server';
import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';


// *****************************************************************************
// USER CRUD OPERATIONS
// *****************************************************************************

/**
 * Fetches a user document from Firestore by user ID.
 */
export async function getUser(userId: string) {
    try {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return { success: false, message: 'User not found.' };
        }

        return { success: true, user: userDoc.data() };
    } catch (error: any) {
        console.error('Error fetching user:', error);
        return { success: false, message: error.message || 'An unknown error occurred while fetching the user.' };
    }
}

/**
 * Creates a new user document in Firestore.
 * This is typically called when a new user signs up.
 */
export async function createUser(userId: string, email: string | null, name: string | null, avatarUrl: string | null) {
    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.set({
            email,
            name,
            avatarUrl,
            createdAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error creating user:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the user.' };
    }
}

/**
 * Updates a user's profile information.
 */
export async function updateUser(formData: FormData) {
    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const avatarFile = formData.get('avatar') as File;

    if (!userId) {
        return { success: false, message: 'User ID is required.' };
    }

    try {
        const userRef = adminDb.collection('users').doc(userId);
        const updateData: { [key: string]: any } = { name };

        if (avatarFile && avatarFile.size > 0) {
            const bucket = adminStorage.bucket();
            const imagePath = `users/${userId}/avatars/${avatarFile.name}`;
            const fileRef = bucket.file(imagePath);
            
            const fileBuffer = Buffer.from(await avatarFile.arrayBuffer());
            await fileRef.save(fileBuffer, { metadata: { contentType: avatarFile.type } });

            const [signedUrl] = await fileRef.getSignedUrl({ action: 'read', expires: '01-01-2100' });
            updateData.avatarUrl = signedUrl;
            updateData.avatarPath = imagePath;
        }

        await userRef.update(updateData);
        revalidatePath('/'); // Revalidate relevant paths

        return { success: true, message: 'Profile updated successfully.' };

    } catch (error: any) {
        console.error('Error updating user:', error);
        return { success: false, message: error.message || 'An unknown error occurred while updating the user.' };
    }
}


/**
 * Deletes a user from Firebase Authentication and Firestore.
 * Also deletes all associated data in Storage.
 */
export async function deleteUser(userId: string) {
    try {
        const userRef = adminDb.collection('users').doc(userId);

        // 1. Delete user's storage folder
        const bucket = adminStorage.bucket();
        const prefix = `users/${userId}/`;
        await bucket.deleteFiles({ prefix: prefix });

        // 2. Delete user's collections and cards (and their images)
        const collectionsSnapshot = await adminDb.collection('collections').where('userId', '==', userId).get();
        const batch = adminDb.batch();

        for (const doc of collectionsSnapshot.docs) {
            const cardsSnapshot = await doc.ref.collection('cards').get();
            for (const cardDoc of cardsSnapshot.docs) {
                // This part is redundant if the top-level folder is deleted, but good for safety
                const cardData = cardDoc.data();
                if (cardData.images && cardData.images.length > 0) {
                    for (const image of cardData.images) {
                        if (image.path) {
                           await bucket.file(image.path).delete({ ignoreNotFound: true });
                        }
                    }
                }
                batch.delete(cardDoc.ref);
            }
            batch.delete(doc.ref);
        }
        await batch.commit();

        // 3. Delete user document from Firestore
        await userRef.delete();

        // 4. Delete user from Firebase Authentication
        await adminAuth.deleteUser(userId);
        
        revalidatePath('/');

        return { success: true, message: 'User and all associated data deleted successfully.' };

    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { 
            success: false, 
            message: error.message || 'An unknown error occurred while deleting the user.',
            error: JSON.stringify(error, null, 2)
        };
    }
}
