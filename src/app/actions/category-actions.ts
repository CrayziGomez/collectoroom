'use server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

// Helper to map icon string to a static path
function getIconPath(iconName: string): string {
    const iconMap = {
        'Layers3': '/icons/layers.svg',
        'Gem': '/icons/gem.svg',
        'Trophy': '/icons/trophy.svg',
        'Ticket': '/icons/ticket.svg',
        'Palette': '/icons/palette.svg',
        'BookOpen': '/icons/book-open.svg',
        'Music': '/icons/music.svg',
        'Camera': '/icons/camera.svg',
    };
    return iconMap[iconName] || '/icons/default.svg';
}

export async function createCategory(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const cat = await prisma.category.create({ data: { name, description: description || '', icon: 'Layers3' } });
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true, categoryId: cat.id };
    } catch (error: any) {
        console.error('Error creating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the category.' };
    }
}

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
        return { success: true, categories: categories.map(c => ({ id: c.id, name: c.name, description: c.description, icon: getIconPath(c.icon || '') })) };
    } catch (error: any) {
        console.error('Error getting categories:', error);
        return { success: false, message: error.message || 'An unknown error occurred while getting categories.' };
    }
}

export async function updateCategory(formData: FormData) {
    const categoryId = formData.get('categoryId') as string;
    const name = formData.get('name') as string;
    // userId is no longer needed as categories are global

    if (!categoryId || !name) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        await prisma.category.update({ where: { id: categoryId }, data: { name } });
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while updating the category.' };
    }
}

export async function deleteCategory(formData: FormData) {
    const categoryId = formData.get('categoryId') as string;
    // userId is no longer needed as categories are global

    if (!categoryId) {
        return { success: false, message: 'Missing required fields.' };
    }

    try {
        const count = await prisma.collection.count({ where: { category_id: categoryId } });
        if (count > 0) {
            return { success: false, message: 'Cannot delete category with active collections. Please reassign them first.' };
        }
        await prisma.category.delete({ where: { id: categoryId } });
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting category:', error);
        return { success: false, message: error.message || 'An unknown error occurred while deleting the category.' };
    }
}
