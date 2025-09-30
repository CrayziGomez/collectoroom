
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import type { ImageRecord } from '@/lib/types';

// Self-contained Firebase Admin initialization
function initializeAdmin() {
  const alreadyCreated = getApps();
  if (alreadyCreated.length > 0) {
    const app = alreadyCreated[0];
    return { db: getFirestore(app), storage: getStorage(app) };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountString);
  } catch (error: any) {
    const preview = serviceAccountString.substring(0, 20);
    throw new Error(`Failed to parse service account JSON. The string starts with: "${preview}". Full string length is ${serviceAccountString.length}. Please verify the secret's format in your hosting environment. Original error: ${error.message}`);
  }

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: 'studio-7145415565-66e7d.firebasestorage.app',
    });
    return { db: getFirestore(app), storage: getStorage(app) };
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

async function uploadImage(file: File, userId: string, collectionId: string, cardId: string): Promise<ImageRecord> {
    const { storage } = initializeAdmin();
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
    const { db } = initializeAdmin();

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
    const { db } = initializeAdmin();

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

        if (!cardDoc.exists) {
            throw new Error("Card not found.");
        }
        
        const originalImages: ImageRecord[] = cardData?.images || [];
        const imagesToDelete = originalImages.filter(origImg => 
            !existingImages.some(existImg => existImg.path === origImg.path)
        );

        const { storage } = initializeAdmin();
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
    const { db, storage } = initializeAdmin();
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
