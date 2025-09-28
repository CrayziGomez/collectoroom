
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';


// --- Server Action to Create a Collection ---
export async function createCollection(formData: FormData) {
    if (!adminDb || !adminStorage) {
      return { success: false, message: 'Firebase Admin SDK not initialized.' };
    }

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
        
        const bucket = adminStorage.bucket();
        const imagePath = `users/${userId}/collections/${collectionId}/${imageFileName}`;
        const fileRef = bucket.file(imagePath);
        
        const fileBuffer = Buffer.from(await coverImageFile.arrayBuffer());
        await fileRef.save(fileBuffer, { metadata: { contentType: coverImageFile.type } });

        // Get public URL using a long-lived signed URL
        const [signedUrl] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '01-01-2100',
        });

        // 2. Create Collection Document in Firestore
        await adminDb.collection('collections').doc(collectionId).set({
            userId,
            name,
            description,
            keywords,
            category,
            isPublic,
            coverImage: signedUrl,
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
