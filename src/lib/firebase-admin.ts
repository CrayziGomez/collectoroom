'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore'; // Import Firestore type
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App | null = null;
let cachedFirestoreDb: Firestore | null = null; // Cache for Firestore instance

const BUCKET_NAME = 'studio-7145415565-66e7d.firebasestorage.app'; // Correct bucket name

function initializeAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // --- Production Environment (App Hosting) ---\n
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
            const serviceAccount = JSON.parse(serviceAccountString);
            
            // Handle escaped newlines in the private key
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
            }

            return initializeApp({
                credential: cert(serviceAccount),
                storageBucket: BUCKET_NAME, // Corrected to use BUCKET_NAME
            });
        } catch (e: any) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from environment variable. Error: ${e.message}`);
        }
    }
    
    // --- Local Development Environment ---\n
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return initializeApp({
                credential: cert(serviceAccount),
                storageBucket: BUCKET_NAME, // Corrected to use BUCKET_NAME
            });
        }
    } catch (e: any) {
        throw new Error(`Failed to load or parse local serviceAccountKey.json. Error: ${e.message}`);
    }

    // --- Fallback / Error State ---\n
    throw new Error(
        'Firebase Admin SDK initialization failed. For production, set the FIREBASE_SERVICE_ACCOUNT_KEY secret. For local development, place a valid `serviceAccountKey.json` file in your project root.'
    );
}

export async function initializeAdmin() {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }

  // --- VERY AGGRESSIVE WORKAROUND: Prevent Firestore init during build/prerender ---
  // We check for any environment variable that might indicate a build-time context.
  // This is a more generalized approach to prevent the Firestore Admin SDK from
  // being fully initialized, thereby avoiding the 'CreateDatabase' call.
  // Common build-time env vars include NEXT_BUILD_ID, CI, VERCEL_ENV, etc.
  // For Firebase App Hosting, NEXT_PHASE might still be the most relevant,
  // but adding a broader check might catch other build contexts.
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                      process.env.CI === 'true' ||
                      !!process.env.NEXT_BUILD_ID; // Check if any of these are present

  if (isBuildTime) {
      console.warn("WARNING: Detected build-time environment. Firestore Admin SDK will return a dummy instance to avoid database creation attempts.");
      return {
          auth: getAuth(adminApp),
          db: {} as Firestore, // Provide an empty object that matches Firestore type for type safety
          storage: getStorage(adminApp)
      };
  }

  // For runtime or other phases, initialize Firestore normally
  if (!cachedFirestoreDb) {
      cachedFirestoreDb = getFirestore(adminApp);
  }

  return {
    auth: getAuth(adminApp),
    db: cachedFirestoreDb,
    storage: getStorage(adminApp)
  };
}
