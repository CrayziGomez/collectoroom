
'use server';

import { initializeAdminApp } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import type { ImageRecord } from '@/lib/types';


async function uploadImage(file: File, userId: string, collectionId: string, cardId: string): Promise<ImageRecord> {
    const { storage } = initializeAdminApp();
    const bucket = storage.bucket();
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
    const { db } = initializeAdminApp();

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
        const cardId = db.collection('cards').doc().id;

        const imageRecords = await Promise.all(
            images.map(image => uploadImage(image, userId, collectionId, cardId))
        );

        const cardRef = db.collection('cards').doc(cardId);
        const collectionRef = db.collection('collections').doc(collectionId);
        
        const collectionDoc = await collectionRef.get();
        if (!collectionDoc.exists) {
            throw new Error("Collection not found.");
        }
        const collectionData = collectionDoc.data();
        const isFirstCard = (collectionData?.cardCount || 0) === 0;

        const batch = db.batch();

        batch.set(cardRef, {
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

        batch.update(collectionRef, collectionUpdate);
        
        await batch.commit();

        revalidatePath(`/collections/${collectionId}`);

        return { success: true, cardId };

    } catch (error: any) {
        console.error('Error creating card:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the card.' };
    }
}

export async function updateCard(formData: FormData) {
    const { db, storage } = initializeAdminApp();

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
        const cardRef = db.collection('cards').doc(cardId);
        const cardDoc = await cardRef.get();
        const cardData = cardDoc.data();

        if (!cardData) {
            throw new Error("Card not found.");
        }
        
        const originalImages: ImageRecord[] = cardData.images || [];
        const imagesToDelete = originalImages.filter(origImg => 
            !existingImages.some(existImg => existImg.path === origImg.path)
        );

        const bucket = storage.bucket();
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


export async function deleteCard(input: { cardId: string, collectionId: string, images: ImageRecord[] }) {
    const { db, storage } = initializeAdminApp();
    const { cardId, collectionId, images } = input;
    
    try {
        const cardRef = db.collection('cards').doc(cardId);
        const collectionRef = db.collection('collections').doc(collectionId);

        const bucket = storage.bucket();
        if (images && images.length > 0) {
            await Promise.all(images.map(image => bucket.file(image.path).delete({ ignoreNotFound: true })));
        }

        const batch = db.batch();
        batch.delete(cardRef);
        batch.update(collectionRef, { cardCount: FieldValue.increment(-1) });
        await batch.commit();

        revalidatePath(`/collections/${collectionId}`);

        return { success: true };

    } catch (error: any) {
         console.error('Error deleting card:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the card.' };
    }
}
