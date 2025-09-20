
'use server';
/**
 * @fileOverview A flow for managing site content, restricted to admins.
 *
 * - updateHomePageContent - Updates dynamic content on the home page.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {initFirebaseAdmin} from '@/lib/firebase-admin';

// Initialize Firebase Admin SDK
initFirebaseAdmin();

const HomePageContentSchema = z.object({
  heroTitle: z.string().optional(),
  heroDescription: z.string().optional(),
  heroImageUrl: z.string().optional(),
  heroImageHint: z.string().optional(),
});

export type HomePageContent = z.infer<typeof HomePageContentSchema>;

async function verifyAdmin(authHeader?: string): Promise<string> {
  if (!authHeader) {
    throw new Error('Authorization header is missing.');
  }
  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    throw new Error('Bearer token is missing.');
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    if (!decodedToken.admin) {
      throw new Error('User is not an admin.');
    }
    return decodedToken.uid;
  } catch (error) {
    console.error('Auth error:', error);
    throw new Error('Authentication failed or user is not an admin.');
  }
}

export const updateHomePageContent = ai.defineFlow(
  {
    name: 'updateHomePageContent',
    inputSchema: HomePageContentSchema,
    outputSchema: z.object({success: z.boolean()}),
    auth: verifyAdmin,
  },
  async (payload) => {
    const db = getFirestore();
    const contentRef = db.collection('siteContent').doc('homePage');

    // Filter out undefined values from payload
    const updateData = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      return {success: true}; // No changes to apply
    }
    
    await contentRef.set(updateData, {merge: true});

    return {success: true};
  }
);
