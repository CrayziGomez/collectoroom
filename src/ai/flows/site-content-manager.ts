
'use server';

/**
 * @fileOverview Manages fetching and updating site content from Firestore.
 *
 * - getSiteContent - Retrieves content for a given page.
 * - updateSiteContent - Updates content for a given page (admin only).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app as clientApp } from '@/lib/firebase';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { auth } from 'firebase-admin';

// Ensure Firebase Admin is initialized
if (!getApps().length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. The Admin SDK requires this for initialization.');
    }
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (e: any) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize Firebase Admin SDK.', e.message);
        throw new Error('Firebase Admin SDK initialization failed.');
    }
}


const db = getFirestore(clientApp);

// Define Zod schemas for input and output.
const SiteContentSchema = z.object({
  id: z.string().describe('The ID of the content document (e.g., "homePage")'),
  title: z.string().describe('The main title text.'),
  description: z.string().describe('The descriptive text.'),
  imageUrl: z.string().optional().describe('URL for the hero image.'),
  imageHint: z.string().optional().describe('Hint for the hero image AI.'),
});

const GetSiteContentInputSchema = z.object({
  pageId: z.string().describe('The ID of the page to fetch content for.'),
});

const UpdateSiteContentInputSchema = SiteContentSchema.extend({
  idToken: z.string().describe('The Firebase ID token of the user.'),
});


// Export types for use in components.
export type SiteContent = z.infer<typeof SiteContentSchema>;

/**
 * Retrieves site content from Firestore.
 * @param {object} input - The input object.
 * @param {string} input.pageId - The ID of the page content to retrieve.
 * @returns {Promise<SiteContent | null>} The site content or null if not found.
 */
export const getSiteContent = ai.defineFlow(
  {
    name: 'getSiteContent',
    inputSchema: GetSiteContentInputSchema,
    outputSchema: SiteContentSchema.nullable(),
  },
  async ({ pageId }) => {
    const docRef = doc(db, 'siteContent', pageId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SiteContent;
    } else {
      // Return default content if it doesn't exist, but don't save it.
      if (pageId === 'homePage') {
        return {
          id: 'homePage',
          title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
          description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
          imageUrl: 'https://picsum.photos/seed/hero/1200/600',
          imageHint: 'collection display',
        };
      }
      return null;
    }
  }
);


/**
 * Verifies the user's ID token and checks if they are an admin.
 * @param {string} idToken - The Firebase ID token.
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
async function verifyAdmin(idToken: string): Promise<boolean> {
  try {
    const decodedToken = await auth().verifyIdToken(idToken);
    return decodedToken.admin === true;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return false;
  }
}

/**
 * Updates site content in Firestore. Admin-only.
 * @param {UpdateSiteContentInputSchema} input - The content to update, including user's ID token.
 * @returns {Promise<{ success: boolean; message: string }>} Result of the operation.
 */
export const updateSiteContent = ai.defineFlow(
  {
    name: 'updateSiteContent',
    inputSchema: UpdateSiteContentInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    const { idToken, id, ...content } = input;

    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
      return { success: false, message: 'Unauthorized: Admin access required.' };
    }

    try {
      const docRef = doc(db, 'siteContent', id);
      await setDoc(docRef, content, { merge: true });
      return { success: true, message: 'Content updated successfully.' };
    } catch (error: any) {
      console.error('Error updating document:', error);
      return { success: false, message: `Update failed: ${error.message}` };
    }
  }
);
