'use server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

const SEED_CATEGORIES = [
  { name: 'Art', icon: 'Palette', description: 'Paintings, sculptures, photography, and more' },
  { name: 'Books & Magazines', icon: 'BookOpen', description: 'Rare editions, vintage publications' },
  { name: 'Coins & Banknotes', icon: 'CircleDollarSign', description: 'Currency from around the world' },
  { name: 'Ephemera', icon: 'Ticket', description: 'Flyers, tickets, stickers, and everyday relics' },
  { name: 'Fashion', icon: 'Shirt', description: 'Clothing, accessories, and iconic styles' },
  { name: 'Food & Beverage', icon: 'UtensilsCrossed', description: 'Menus, tins, coasters, and packaging' },
  { name: 'Historic Memorabilia', icon: 'Landmark', description: 'Artifacts from significant moments' },
  { name: 'Music', icon: 'Music', description: 'Records, tapes, instruments, and memorabilia' },
  { name: 'Nature', icon: 'Leaf', description: 'Fossils, shells, rocks, and botanical finds' },
  { name: 'Pop Culture', icon: 'Star', description: 'Posters, autographs, and media icons' },
  { name: 'Stamps', icon: 'Mail', description: 'Postal history and philatelic treasures' },
  { name: 'Technology', icon: 'Laptop', description: 'Gadgets, manuals, and vintage electronics' },
  { name: 'Toys & Games', icon: 'ToyBrick', description: 'Nostalgic playthings and collectibles' },
  { name: 'Travel Souvenirs', icon: 'Plane', description: 'Mementos from around the globe' },
  { name: 'Vehicles', icon: 'Car', description: 'Classic cars, motorcycles, and boats' },
  { name: 'Watches & Clocks', icon: 'Clock', description: 'Timepieces with character and history' },
];

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

export async function seedDefaultCategories() {
    try {
        const existing = await prisma.category.findMany({ select: { name: true } });
        const existingNames = new Set(existing.map(c => c.name));
        const toInsert = SEED_CATEGORIES.filter(c => !existingNames.has(c.name));
        if (toInsert.length === 0) {
            return { success: true, inserted: 0, message: 'All default categories already exist.' };
        }
        await prisma.category.createMany({
            data: toInsert.map(c => ({ name: c.name, description: c.description || '', icon: c.icon || 'Layers3' })),
            skipDuplicates: true,
        });
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true, inserted: toInsert.length };
    } catch (error: any) {
        console.error('Error seeding categories:', error);
        return { success: false, message: error.message || 'Failed to seed categories.' };
    }
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
