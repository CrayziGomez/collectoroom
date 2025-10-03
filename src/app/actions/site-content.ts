'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';


export async function getSiteContent() {
    try {
        const contentRef = adminDb.collection('siteContent').doc('content');
        const doc = await contentRef.get();

        if (!doc.exists) {
            return { success: false, message: "Content not found" };
        }

        return { success: true, data: doc.data() };
    } catch (error: any) {
        console.error("Error fetching site content:", error);
        return { success: false, message: error.message };
    }
}


async function uploadHeroImage(file: File): Promise<{ url: string, path: string }> {
    const bucket = adminStorage.bucket();
    const imageFileName = `${uuidv4()}-${file.name}`;
    const imagePath = `site-content/hero/${imageFileName}`;
    const fileRef = bucket.file(imagePath);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(fileBuffer, { metadata: { contentType: file.type } });

    const [signedUrl] = await fileRef.getSignedUrl({ action: 'read', expires: '01-01-2100' });
    return { url: signedUrl, path: imagePath };
}

export async function updateSiteContent(formData: FormData) {
    const title = formData.get('title') as string;
    const subtitle = formData.get('subtitle') as string;
    const heroImageFile = formData.get('heroImage') as File;
    const existingHeroImagePath = formData.get('existingHeroImagePath') as string;

    let heroImageUrl = formData.get('heroImageUrl') as string;
    let heroImagePath = existingHeroImagePath;

    const contentRef = adminDb.collection('siteContent').doc('content');

    try {
        // Handle hero image update
        if (heroImageFile && heroImageFile.size > 0) {
            // If there's an old image, delete it from storage
            if (existingHeroImagePath) {
                try {
                    await adminStorage.bucket().file(existingHeroImagePath).delete({ ignoreNotFound: true });
                } catch (storageError: any) {
                    console.error(`Failed to delete old hero image, but continuing: ${storageError.message}`);
                }
            }
            // Upload the new image
            const { url, path } = await uploadHeroImage(heroImageFile);
            heroImageUrl = url;
            heroImagePath = path;
        }

        const updateData: { [key: string]: any } = {};
        if (title) updateData.title = title;
        if (subtitle) updateData.subtitle = subtitle;
        if (heroImageUrl) updateData.heroImageUrl = heroImageUrl;
        if (heroImagePath) updateData.heroImagePath = heroImagePath;


        await contentRef.set(updateData, { merge: true });

        revalidatePath('/');

        return { success: true, message: "Content updated successfully." };

    } catch (error: any) {
        console.error("Error updating site content:", error);
        return { success: false, message: error.message };
    }
}
