'use server';

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

/**
 * Toggles the isPublic flag for a given collection.
 * This is a server action and must be called from the server or a client component.
 * It includes a security check to ensure that only the owner of the collection can modify it.
 */
export const toggleCollectionPrivacy = async (collectionId: string, newPrivacyState: boolean): Promise<{ success: boolean; error?: string }> => {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'You must be logged in to perform this action.' };

    if (!collectionId || typeof newPrivacyState !== 'boolean') {
        return { success: false, error: 'Invalid arguments provided.' };
    }

    try {
        const col = await prisma.collection.findUnique({ where: { id: collectionId } });
        if (!col) return { success: false, error: 'Collection not found.' };
        if (col.user_id !== userId) return { success: false, error: 'You do not have permission to modify this collection.' };

        await prisma.collection.update({ where: { id: collectionId }, data: { is_public: newPrivacyState } });

        // Revalidate the paths that display this collection data.
        // This tells Next.js to re-render these pages on the next visit.
        revalidatePath(`/collections/${collectionId}`);
        revalidatePath('/gallery');
        revalidatePath('/my-collectoroom');

        return { success: true };

    } catch (error) {
        console.error('Error toggling collection privacy:', error);
        // In case of a database error, return a generic error message.
        return { success: false, error: 'An unexpected error occurred while updating the collection.' };
    }
};

export const updateCollection = async (formData: FormData) => {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Not authenticated' };

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const keywords = formData.get('keywords') as string;
    const category = formData.get('category') as string;
    const isPublic = formData.get('isPublic') === 'true' || formData.get('isPublic') === '1' || formData.get('isPublic') === true;
    const coverImage = formData.get('coverImage') as string | null;
    const coverImageHint = formData.get('coverImageHint') as string | null;

    if (!id || !name || !category) return { success: false, error: 'Missing required fields' };

    try {
        const col = await prisma.collection.findUnique({ where: { id } });
        if (!col) return { success: false, error: 'Collection not found' };
        if (col.user_id !== userId) return { success: false, error: 'Not authorized' };

        const data: any = {
            name,
            description,
            keywords,
            category_id: category,
            is_public: Boolean(isPublic),
        };

        if (coverImage) {
            data.cover_image = coverImage;
            if (coverImageHint) data.cover_image_hint = coverImageHint;
        }

        await prisma.collection.update({ where: { id }, data });

        revalidatePath(`/collections/${id}`);
        revalidatePath('/gallery');
        revalidatePath('/my-collectoroom');

        return { success: true };
    } catch (error) {
        console.error('Error updating collection:', error);
        return { success: false, error: 'Unexpected error' };
    }
};
