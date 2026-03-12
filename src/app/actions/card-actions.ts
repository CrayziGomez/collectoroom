
"use server";

import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import type { ImageRecord } from '@/lib/types';
import prisma from '@/lib/prisma';
import { uploadCardImage, deleteFile } from '@/lib/storage';
import { getUser } from './user-actions'; // Import the user-actions

async function uploadImage(file: File, userId: string, collectionId: string, cardId: string): Promise<ImageRecord> {
    const res = await uploadCardImage(file, userId, collectionId, cardId);
    return { url: res.url, path: res.path, hint: 's3' } as ImageRecord;
}

export async function createCard(formData: FormData) {
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

    let imageRecords: ImageRecord[] = [];

    try {
        const user = await getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.cardCount >= user.plan.cardLimit) {
            return { 
                success: false, 
                message: `You\'ve reached your limit of ${user.plan.cardLimit} cards. Please upgrade your plan.` 
            };
        }

        const cardId = uuidv4();

        imageRecords = await Promise.all(
            images.map(image => uploadImage(image, userId, collectionId, cardId))
        );

        // Use a Prisma transaction to create card, images, and update counts
        await prisma.$transaction(async (tx) => {
            const collection = await tx.collection.findUnique({ where: { id: collectionId } });
            if (!collection) throw new Error('Collection not found. Cannot add card.');

            const isFirstCard = (collection.card_count || 0) === 0;

            await tx.card.create({
                data: {
                    id: cardId,
                    collection_id: collectionId,
                    user_id: userId,
                    title,
                    description,
                    status,
                    category_id: category,
                },
            });

            await Promise.all(imageRecords.map(rec => tx.cardImage.create({ data: {
                id: uuidv4(),
                card_id: cardId,
                url: rec.url,
                path: rec.path,
                hint: rec.hint,
                position: 0,
            }})));

            const collectionUpdate: any = { card_count: { increment: 1 } };
            if (isFirstCard && imageRecords.length > 0) {
                collectionUpdate.cover_image = imageRecords[0].url;
                collectionUpdate.cover_image_hint = imageRecords[0].hint;
            }

            await tx.collection.update({ where: { id: collectionId }, data: collectionUpdate });
            await tx.user.update({ where: { id: userId }, data: { card_count: { increment: 1 } } });
        });

        revalidatePath(`/collections/${collectionId}`);
        revalidatePath('/gallery');

        return { success: true, cardId };

    } catch (error: any) {
        console.error('Error creating card:', error);
        
        if (imageRecords.length > 0) {
            await Promise.all(imageRecords.map(record => deleteFile(record.path).catch(() => {})));
        }

        return { success: false, message: error.message || 'An unknown error occurred while creating the card.' };
    }
}

export async function updateCard(formData: FormData) {
    const userId = formData.get('userId') as string;
    const cardId = formData.get('cardId') as string;
    const collectionId = formData.get('collectionId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const category = formData.get('category') as string;
    const existingImages: ImageRecord[] = JSON.parse(formData.get('existingImages') as string);
    const newImages = formData.getAll('newImages') as File[];

    if (!userId || !cardId || !collectionId || !title || !status || !category) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const card = await prisma.card.findUnique({ where: { id: cardId }, include: { images: true } });
        if (!card) throw new Error('Card not found.');

        const originalImages = card.images || [];
        const imagesToDelete = originalImages.filter(origImg => !existingImages.some(existImg => existImg.path === origImg.path));

        // delete files
        await Promise.all(imagesToDelete.map(img => deleteFile(img.path)));

        const newImageRecords = await Promise.all(newImages.map(image => uploadImage(image, userId, collectionId, cardId)));

        // Insert new images and remove deleted images from DB
        await prisma.$transaction(async (tx) => {
            if (imagesToDelete.length > 0) {
                const idsToDelete = imagesToDelete.map(i => i.id);
                await tx.cardImage.deleteMany({ where: { id: { in: idsToDelete } } });
            }

            await Promise.all(newImageRecords.map(rec => tx.cardImage.create({ data: {
                id: uuidv4(), card_id: cardId, url: rec.url, path: rec.path, hint: rec.hint, position: 0
            }})));

            await tx.card.update({ where: { id: cardId }, data: { title, description, status, category_id: category } });
        });

        revalidatePath(`/collections/${collectionId}`);
        revalidatePath(`/collections/${collectionId}/cards/${cardId}`);

        return { success: true };

    } catch (error: any) {
        console.error('Error updating card:', error);
        return { success: false, message: error.message || 'An unknown error occurred while updating the card.' };
    }
}

// **FIXED: Now correctly decrements user's card count**
export async function deleteCard(input: { cardId: string, collectionId: string, images: ImageRecord[], userId: string }) {
    const { cardId, collectionId, images, userId } = input;
    
    if (!cardId || !collectionId || !userId) {
        return { success: false, message: 'Missing card, collection, or user ID.' };
    }

    try {
        // delete files from storage
        if (images && images.length > 0) {
            await Promise.all(images.map(image => deleteFile(image.path)));
        }

        // remove card and decrement counts
        await prisma.$transaction(async (tx) => {
            await tx.card.delete({ where: { id: cardId } });
            await tx.collection.updateMany({ where: { id: collectionId }, data: { card_count: { decrement: 1 } } });
            await tx.user.updateMany({ where: { id: userId }, data: { card_count: { decrement: 1 } } });
        });

        revalidatePath(`/collections/${collectionId}`);
        revalidatePath('/gallery');

        return { success: true };

    } catch (error: any) {
         console.error('Error deleting card:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the card.' };
    }
}
