
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

// --- Initialize Firebase Admin ---
let adminApp: App;
let adminDb: Firestore;
let adminStorage: Storage;

function initializeAdmin() {
    if (getApps().length > 0) {
        adminApp = getApps()[0];
    } else {
        try {
            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            if (!serviceAccountString) {
                throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
            }
             const serviceAccount = JSON.parse(
                Buffer.from(serviceAccountString, 'base64').toString('utf8')
            );

            adminApp = initializeApp({
                credential: cert(serviceAccount),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
        } catch (e: any) {
            throw new Error(`Firebase Admin SDK initialization failed: ${e.message}`);
        }
    }
    adminDb = getFirestore(adminApp);
    adminStorage = getStorage(adminApp);
}


// --- Server Action to Create a Collection ---
export async function createCollection(formData: FormData) {
    if (!adminApp) initializeAdmin();

    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const keywords = formData.get('keywords') as string;
    const category = formData.get('category') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const coverImageFile = formData.get('coverImage') as File;
    const coverImageHint = 'custom upload'; // We can enhance this later with AI

    if (!userId || !name || !category || !coverImageFile) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        // 1. Upload Image to Storage
        const collectionId = adminDb.collection('collections').doc().id; // Generate ID beforehand
        const imageFileName = `${uuidv4()}-${coverImageFile.name}`;
        const imagePath = `users/${userId}/collections/${collectionId}/${imageFileName}`;
        
        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(imagePath);
        
        const fileBuffer = Buffer.from(await coverImageFile.arrayBuffer());
        await fileRef.save(fileBuffer, { metadata: { contentType: coverImageFile.type } });

        // Get public URL using the public-facing format
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;

        // 2. Create Collection Document in Firestore
        await adminDb.collection('collections').doc(collectionId).set({
            userId,
            name,
            description,
            keywords,
            category,
            isPublic,
            coverImage: publicUrl,
            coverImageHint,
            cardCount: 0,
            createdAt: new Date(),
        });
        
        // 3. Revalidate paths
        revalidatePath('/my-collectoroom');
        revalidatePath('/gallery');
        
        return { success: true, message: 'Collection created!', collectionId };

    } catch (error: any) {
        console.error("Error creating collection:", error);
        return { success: false, message: error.message || 'Failed to create collection.' };
    }
}
