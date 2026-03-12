"use server";
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getUser } from './user-actions';

export async function createCollection(formData: FormData) {
    const name = formData.get('name') as string;
    const userId = formData.get('userId') as string;
    const category = formData.get('category') as string;

    if (!name || !userId || !category) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        // **FIXED: Add user plan limit check**
        const user = await getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.collectionCount >= user.plan.collectionLimit) {
            return { 
                success: false, 
                message: `You\'ve reached your limit of ${user.plan.collectionLimit} collections. Please upgrade your plan.` 
            };
        }

        // Use a Prisma transaction to create collection and increment user's count
        const created = await prisma.$transaction(async (tx) => {
            const col = await tx.collection.create({
                data: {
                    name,
                    user_id: userId,
                    category_id: category,
                    card_count: 0,
                    cover_image: '',
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
