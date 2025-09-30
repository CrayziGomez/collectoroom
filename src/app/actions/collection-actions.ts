
'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { initializeAdmin } from '@/lib/firebase-admin';

export async function createCollection(formData: FormData) {
    const { db } = initializeAdmin();

    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const keywords = formData.get('keywords') as string;
    const category = formData.get('category') as string;
    const isPublic = formData.get('isPublic') === 'true';

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
