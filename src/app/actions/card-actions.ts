
'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import type { ImageRecord } from '@/lib/types';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { getUser } from './user-actions'; // Import the user-actions

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

    let imageRecords: ImageRecord[] = [];

    try {
        const user = await getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.cardCount >= user.plan.cardLimit) {
            return { 
                success: false, 
                message: `You\'ve reached your limit of ${user.plan.cardLimit} cards. Please upgrade your plan.` 
            };
        }

        const cardId = adminDb.collection('cards').doc().id;
        
        imageRecords = await Promise.all(
            images.map(image => uploadImage(image, userId, collectionId, cardId))
        );

        const cardRef = adminDb.collection('cards').doc(cardId);
        const collectionRef = adminDb.collection('collections').doc(collectionId);
        const userRef = adminDb.collection('users').doc(userId);

        await adminDb.runTransaction(async (transaction) => {
            const collectionDoc = await transaction.get(collectionRef);
            if (!collectionDoc.exists) {
                throw new Error("Collection not found. Cannot add card.");
            }

            const collectionData = collectionDoc.data();
            const isFirstCard = (collectionData?.cardCount || 0) === 0;

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
            
            const collectionUpdate: { [key: string]: any } = { 
                cardCount: FieldValue.increment(1) 
            };

            if (isFirstCard && imageRecords.length > 0) {
                collectionUpdate.coverImage = imageRecords[0].url;
                collectionUpdate.coverImageHint = imageRecords[0].hint;
            }

            transaction.update(collectionRef, collectionUpdate);
            transaction.update(userRef, { cardCount: FieldValue.increment(1) });
        });

        revalidatePath(`/collections/${collectionId}`);
        revalidatePath('/gallery');

        return { success: true, cardId };

    } catch (error: any) {
        console.error('Error creating card:', error);
        
        if (imageRecords.length > 0) {
            const bucket = adminStorage.bucket();
            await Promise.all(imageRecords.map(record => bucket.file(record.path).delete({ ignoreNotFound: true })));
        }

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
    const category = formData.get('category') as string;
    const existingImages: ImageRecord[] = JSON.parse(formData.get('existingImages') as string);
    const newImages = formData.getAll('newImages') as File[];

    if (!userId || !cardId || !collectionId || !title || !status || !category) {
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
            category,
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

// **FIXED: Now correctly decrements user's card count**
export async function deleteCard(input: { cardId: string, collectionId: string, images: ImageRecord[], userId: string }) {
    const { cardId, collectionId, images, userId } = input;
    
    if (!cardId || !collectionId || !userId) {
        return { success: false, message: 'Missing card, collection, or user ID.' };
    }

    try {
        const cardRef = adminDb.collection('cards').doc(cardId);
        const collectionRef = adminDb.collection('collections').doc(collectionId);
        const userRef = adminDb.collection('users').doc(userId);

        const bucket = adminStorage.bucket();
        if (images && images.length > 0) {
            await Promise.all(images.map(image => bucket.file(image.path).delete({ ignoreNotFound: true })));
        }

        await adminDb.runTransaction(async (transaction) => {
            const collectionDoc = await transaction.get(collectionRef);
            if (collectionDoc.exists) {
                 transaction.update(collectionRef, { cardCount: FieldValue.increment(-1) });
            }
            
            // Also decrement the user's card count
            transaction.update(userRef, { cardCount: FieldValue.increment(-1) });
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
