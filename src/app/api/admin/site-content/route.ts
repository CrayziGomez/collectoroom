import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { uploadSiteImage, deleteFile } from '@/lib/storage';

export async function GET() {
  try {
    const content = await prisma.siteContent.findUnique({ where: { id: 'content' } });
    if (!content) {
      return NextResponse.json({ heroImageUrl: '', heroImagePath: '', title: '', subtitle: '' });
    }
    return NextResponse.json({
      ...content,
      heroImageUrl: content.hero_image_url ?? '',
      heroImagePath: content.hero_image_path ?? '',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify admin
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const formData = await req.formData();
    const title = formData.get('title') as string | null;
    const subtitle = formData.get('subtitle') as string | null;
    const heroImageFile = formData.get('heroImage') as File | null;
    const existingHeroImagePath = formData.get('existingHeroImagePath') as string | null;
    let heroImageUrl = formData.get('heroImageUrl') as string | null;
    let heroImagePath = existingHeroImagePath;

    if (heroImageFile && heroImageFile.size > 0) {
      if (existingHeroImagePath) {
        try { await deleteFile(existingHeroImagePath); } catch {}
      }
      const result = await uploadSiteImage(heroImageFile, 'hero');
      heroImageUrl = result.url;
      heroImagePath = result.path;
    }

    const updateData: Record<string, any> = {};
    if (title !== null) updateData.title = title;
    if (subtitle !== null) updateData.subtitle = subtitle;
    if (heroImageUrl) updateData.hero_image_url = heroImageUrl;
    if (heroImagePath) updateData.hero_image_path = heroImagePath;

    const upsert = await prisma.siteContent.upsert({
      where: { id: 'content' },
      update: { ...updateData, updated_at: new Date() },
      create: { id: 'content', ...updateData },
    });

    revalidatePath('/');

    return NextResponse.json({
      success: true,
      data: {
        ...upsert,
        heroImageUrl: upsert.hero_image_url ?? '',
        heroImagePath: upsert.hero_image_path ?? '',
      },
    });
  } catch (e: any) {
    console.error('[POST /api/admin/site-content]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
