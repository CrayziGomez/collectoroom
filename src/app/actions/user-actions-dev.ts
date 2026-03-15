"use server";

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

// **FIXED: New function to delete a collection and decrement user\'s collection count**
export async function deleteCollection(input: { collectionId: string, userId: string }) {
    const { collectionId, userId } = input;
    
    if (!collectionId || !userId) {
        return { success: false, message: 'Missing collection or user ID.' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Delete related card images and cards
            const cards = await tx.card.findMany({ where: { collection_id: collectionId }, select: { id: true } });
            const cardIds = cards.map(c => c.id);
            if (cardIds.length) {
                await tx.cardImage.deleteMany({ where: { card_id: { in: cardIds } } });
                await tx.card.deleteMany({ where: { id: { in: cardIds } } });
            }

            // Delete collection
            await tx.collection.delete({ where: { id: collectionId } });

            // Decrement user's collection_count
            await tx.user.update({ where: { id: userId }, data: { collection_count: { decrement: 1 } } });
        });

        revalidatePath('/');

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting collection:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the collection.' };
    }
}

// **FIXED: New function to recount all of a user\'s cards and collections**
export async function recountUsage(userId: string) {
    if (!userId) {
        return { success: false, message: 'Missing user ID.' };
    }

    try {
        const collectionCount = await prisma.collection.count({ where: { user_id: userId } });
        const cardCount = await prisma.card.count({ where: { user_id: userId } });

        await prisma.user.update({ where: { id: userId }, data: { collection_count: collectionCount, card_count: cardCount } });

        return { success: true, collectionCount, cardCount };
    } catch (error: any) {
        console.error('Error recounting usage:', error);
        return { success: false, message: error.message || 'An unknown error occurred while recounting usage.' };
    }
}
