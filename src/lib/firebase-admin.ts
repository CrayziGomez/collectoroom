
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App | null = null;

const BUCKET_NAME = 'studio-7145415565-66e7d.firebasestorage.app';

function initializeAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // --- Production Environment (App Hosting) ---
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
            const serviceAccount = JSON.parse(serviceAccountString);
            
            // Handle escaped newlines in the private key
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            return initializeApp({
                credential: cert(serviceAccount),
                storageBucket: BUCKET_NAME,
            });
        } catch (e: any) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from environment variable. Error: ${e.message}`);
        }
    }
    
    // --- Local Development Environment ---
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return initializeApp({
                credential: cert(serviceAccount),
                storageBucket: BUCKET_NAME,
            });
        }
    } catch (e: any) {
        throw new Error(`Failed to load or parse local serviceAccountKey.json. Error: ${e.message}`);
    }

    // --- Fallback / Error State ---
    throw new Error(
        'Firebase Admin SDK initialization failed. For production, set the FIREBASE_SERVICE_ACCOUNT_KEY secret. For local development, place a valid `serviceAccountKey.json` file in your project root.'
    );
}

export async function initializeAdmin() {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }

  return {
    auth: getAuth(adminApp),
    db: getFirestore(adminApp),
    storage: getStorage(adminApp)
  };
}

    