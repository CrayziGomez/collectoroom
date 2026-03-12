
"use server";

import prisma from '@/lib/prisma';
import { uploadSiteImage, deleteFile } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';


export async function getSiteContent() {
    try {
        const content = await prisma.siteContent.findUnique({ where: { id: 'content' } });
        if (!content) {
            const defaultContent = await prisma.siteContent.create({ data: {
                id: 'content',
                title: 'Welcome to Your Collection!',
                subtitle: 'This is a brief description of your collection. You can edit this in the admin dashboard.',
                hero_image_url: '',
                hero_image_path: '',
                how_it_works_steps: [] as any,
            }});
            return { success: true, data: defaultContent };
        }
        return { success: true, data: content };
    } catch (error: any) {
        console.error('Error fetching site content:', error);
        return { success: false, message: error.message };
    }
}


async function uploadHeroImage(file: File) {
    return uploadSiteImage(file, 'hero');
}

export async function updateSiteContent(formData: FormData) {
    const title = formData.get('title') as string;
    const subtitle = formData.get('subtitle') as string;
    const heroImageFile = formData.get('heroImage') as File;
    const existingHeroImagePath = formData.get('existingHeroImagePath') as string;

    // Correctly initialize heroImageUrl from the form, but it will be overwritten if a new file is uploaded.
    let heroImageUrl = formData.get('heroImageUrl') as string | null;
    let heroImagePath = existingHeroImagePath;

    // Use Prisma to update the single `site_content` row
    const existing = await prisma.siteContent.findUnique({ where: { id: 'content' } });

    try {
        // Handle hero image update
        if (heroImageFile && (heroImageFile as any).size > 0) {
            if (existingHeroImagePath) {
                try {
                    await deleteFile(existingHeroImagePath);
                } catch (e) {
                    console.error('Failed to delete old hero image, continuing', e);
                }
            }
            const { url, path } = await uploadHeroImage(heroImageFile as File);
            heroImageUrl = url;
            heroImagePath = path;
        }

        const updateData: { [key: string]: any } = {};
        if (title) updateData.title = title;
        if (subtitle) updateData.subtitle = subtitle;
        if (heroImageUrl) updateData.heroImageUrl = heroImageUrl;
        if (heroImagePath) updateData.heroImagePath = heroImagePath;

                const upsert = await prisma.siteContent.upsert({
                    where: { id: 'content' },
                    update: {
                        ...updateData,
                        updated_at: new Date(),
                    },
                    create: {
                        id: 'content',
                        ...updateData,
                    }
                });

                revalidatePath('/');

                return { success: true, message: 'Content updated successfully.', imageUrl: heroImageUrl, data: upsert };

    } catch (error: any) {
        console.error("Error updating site content:", error);
        return { success: false, message: error.message };
    }
}
