
'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import type { ImageRecord } from '@/lib/types';
import { adminDb, adminStorage } from '@/lib/firebase-admin';

// This helper function remains the same.
async function uploadImage(file: File, userId: string, collectionId: string, cardId: string): Promise<ImageRecord> {
    const bucket = adminStorage.bucket();
    const imageFileName = `${uuidv4()}-${file.name}`;
    const imagePath = `users/${userId}/cards/${cardId}/${imageFileName}`;
    const fileRef = bucket.file(imagePath);
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(fileBuffer, { metadata: { contentType: file.type } });

    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '01-01-2100',
    });

    return {
        url: signedUrl,
        path: imagePath,
        hint: 'custom upload'
    };
}

// Step 1: Rewriting createCard to use a secure and atomic transaction.
export async function createCard(formData: FormData) {
    const userId = formData.get('userId') as string;
    const collectionId = formData.get('collectionId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const category = formData.get('category') as string;
    const images = formData.getAll('images') as File[];

    if (!userId || !collectionId || !title || !status || !category || images.length === 0) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const cardId = adminDb.collection('cards').doc().id;
        
        // Image uploads still happen first, as they are separate from the Firestore transaction.
        const imageRecords = await Promise.all(
            images.map(image => uploadImage(image, userId, collectionId, cardId))
        );

        const cardRef = adminDb.collection('cards').doc(cardId);
        const collectionRef = adminDb.collection('collections').doc(collectionId);
        
        // The core logic is now wrapped in a transaction.
        await adminDb.runTransaction(async (transaction) => {
            const collectionDoc = await transaction.get(collectionRef);
            if (!collectionDoc.exists) {
                throw new Error("Collection not found. Cannot add card.");
            }

            const collectionData = collectionDoc.data();
            const isFirstCard = (collectionData?.cardCount || 0) === 0;

            // 1. Create the new card.
            transaction.set(cardRef, {
                userId,
                collectionId,
                title,
                description,
                status,
                category,
                images: imageRecords,
                createdAt: FieldValue.serverTimestamp(),
            });
            
            // 2. Prepare the update for the collection.
            const collectionUpdate: { [key: string]: any } = { 
                cardCount: FieldValue.increment(1) 
            };

            // If this is the first card, set the collection's cover image.
            if (isFirstCard && imageRecords.length > 0) {
                collectionUpdate.coverImage = imageRecords[0].url;
                collectionUpdate.coverImageHint = imageRecords[0].hint;
            }

            // 3. Atomically update the collection.
            transaction.update(collectionRef, collectionUpdate);
        });

        revalidatePath(`/collections/${collectionId}`);
        revalidatePath('/gallery'); // Also revalidate the gallery

        return { success: true, cardId };

    } catch (error: any) {
        console.error('Error creating card:', error);
        // Clean up uploaded images if the transaction fails
        const bucket = adminStorage.bucket();
        await Promise.all(images.map(image => bucket.file(`users/${userId}/cards/${cardId}/${uuidv4()}-${image.name}`).delete({ ignoreNotFound: true })));
        return { success: false, message: error.message || 'An unknown error occurred while creating the card.' };
    }
}

export async function updateCard(formData: FormData) {
    const userId = formData.get('userId') as string;
    const cardId = formData.get('cardId') as string;
    const collectionId = formData.get('collectionId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const existingImages: ImageRecord[] = JSON.parse(formData.get('existingImages') as string);
    const newImages = formData.getAll('newImages') as File[];

    if (!userId || !cardId || !collectionId || !title || !status) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const cardRef = adminDb.collection('cards').doc(cardId);
        const cardDoc = await cardRef.get();
        const cardData = cardDoc.data();

        if (!cardDoc.exists) {
            throw new Error("Card not found.");
        }
        
        const originalImages: ImageRecord[] = cardData?.images || [];
        const imagesToDelete = originalImages.filter(origImg => 
            !existingImages.some(existImg => existImg.path === origImg.path)
        );

        const bucket = adminStorage.bucket();
        await Promise.all(imagesToDelete.map(image => bucket.file(image.path).delete({ ignoreNotFound: true })));
        
        const newImageRecords = await Promise.all(
            newImages.map(image => uploadImage(image, userId, collectionId, cardId))
        );

        const finalImages = [...existingImages, ...newImageRecords];

        await cardRef.update({
            title,
            description,
            status,
            images: finalImages,
        });

        revalidatePath(`/collections/${collectionId}`);
        revalidatePath(`/collections/${collectionId}/cards/${cardId}`);

        return { success: true };

    } catch (error: any) {
        console.error('Error updating card:', error);
        return { success: false, message: error.message || 'An unknown error occurred while updating the card.' };
    }
}


// Step 2: Rewriting deleteCard to also use a transaction for safety.
export async function deleteCard(input: { cardId: string, collectionId: string, images: ImageRecord[] }) {
    const { cardId, collectionId, images } = input;
    
    if (!cardId || !collectionId) {
        return { success: false, message: 'Missing card or collection ID.' };
    }

    try {
        const cardRef = adminDb.collection('cards').doc(cardId);
        const collectionRef = adminDb.collection('collections').doc(collectionId);

        // Delete associated images from storage first.
        const bucket = adminStorage.bucket();
        if (images && images.length > 0) {
            await Promise.all(images.map(image => bucket.file(image.path).delete({ ignoreNotFound: true })));
        }

        // Atomically delete the card and decrement the count.
        await adminDb.runTransaction(async (transaction) => {
            // Verify collection exists before trying to update it.
            const collectionDoc = await transaction.get(collectionRef);
            if (!collectionDoc.exists) {
                // If the collection doesn't exist, we can't decrement the count,
                // but we should still attempt to delete the orphaned card.
                console.warn(`Collection ${collectionId} not found, but attempting to delete card ${cardId}.`);
            } else {
                 transaction.update(collectionRef, { cardCount: FieldValue.increment(-1) });
            }
            transaction.delete(cardRef);
        });

        revalidatePath(`/collections/${collectionId}`);
        revalidatePath('/gallery');

        return { success: true };

    } catch (error: any) {
         console.error('Error deleting card:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the card.' };
    }
}
