
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';


// --- Server Action to Create a Collection ---
export async function createCollection(formData: FormData) {
    if (!adminDb) {
      return { success: false, message: 'Firebase Admin SDK not initialized.' };
    }

    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const keywords = formData.get('keywords') as string;
    const category = formData.get('category') as string;
    const isPublic = formData.get('isPublic') === 'true';

    // Placeholder image details
    const coverImage = `https://picsum.photos/seed/${uuidv4()}/400/300`;
    const coverImageHint = 'collection display';

    if (!userId || !name || !category) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const collectionId = adminDb.collection('collections').doc().id;

        // 2. Create Collection Document in Firestore
        await adminDb.collection('collections').doc(collectionId).set({
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
        
        // 3. Revalidate paths
        revalidatePath('/my-collectoroom');
        revalidatePath('/gallery');
        
        return { success: true, message: 'Collection created!', collectionId };

    } catch (error: any) {
        console.error("Error creating collection:", error);
        return { success: false, message: error.message || 'Failed to create collection.' };
    }
}
