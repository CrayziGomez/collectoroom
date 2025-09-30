
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

function initializeScopedAdminApp() {
    const appName = 'scoped-collection-actions-app';
    const existingApp = getApps().find(app => app.name === appName);
    if (existingApp) {
        return existingApp;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    }
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
    return initializeApp({
        credential: cert(serviceAccount)
    }, appName);
}


export async function createCollection(formData: FormData) {
    const app = initializeScopedAdminApp();
    const db = getFirestore(app);

    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const keywords = formData.get('keywords') as string;
    const category = formData.get('category') as string;
    const isPublic = formData.get('isPublic') === 'true';

    // Default image is now the logo
    const coverImage = '/images/CR_Logo_Gry.png';
    const coverImageHint = 'CollectoRoom logo';

    if (!userId || !name || !category) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const collectionId = db.collection('collections').doc().id;

        await db.collection('collections').doc(collectionId).set({
            userId,
            name,
            description,
            keywords,
            category,
            isPublic,
            coverImage: coverImage,
            coverImageHint,
            cardCount: 0,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        revalidatePath('/my-collectoroom');
        revalidatePath('/gallery');
        
        return { success: true, message: 'Collection created!', collectionId };

    } catch (error: any) {
        console.error("Error creating collection:", error);
        return { success: false, message: error.message || 'Failed to create collection.' };
    }
}
