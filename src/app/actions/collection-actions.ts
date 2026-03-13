"use server";
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function createCollection(formData: FormData) {
    const name = formData.get('name') as string;
    const userId = formData.get('userId') as string;
    const categoryId = formData.get('category') as string;
    const description = formData.get('description') as string || null;
    const keywords = formData.get('keywords') as string || null;
    const isPublic = formData.get('isPublic') !== 'false';

    if (!name || !userId || !categoryId) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        // Use a Prisma transaction to create collection and increment user's count
        const created = await prisma.$transaction(async (tx) => {
            const col = await tx.collection.create({
                data: {
                    name,
                    user_id: userId,
                    category_id: categoryId,
                    description,
                    keywords,
                    is_public: isPublic,
                    card_count: 0,
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { collection_count: { increment: 1 } },
            });

            return col;
        });

        revalidatePath('/');

        return { success: true, collectionId: created.id };

    } catch (error: any) {
        console.error('Error creating collection:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the collection.' };
    }
}

export async function toggleCollectionPrivacy(collectionId: string, isPublic: boolean) {
    try {
        await prisma.collection.update({ where: { id: collectionId }, data: { is_public: isPublic } });
        revalidatePath(`/collections/${collectionId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteCollection(collectionId: string, userId: string) {
    try {
        const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
        if (!collection || collection.user_id !== userId) {
            return { success: false, message: 'Not found or unauthorized.' };
        }
        await prisma.$transaction(async (tx) => {
            await tx.card.deleteMany({ where: { collection_id: collectionId } });
            await tx.collection.delete({ where: { id: collectionId } });
            await tx.user.update({ where: { id: userId }, data: { collection_count: { decrement: 1 } } });
        });
        revalidatePath('/my-collectoroom');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
