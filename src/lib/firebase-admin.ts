
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App | null = null;

function initializeAdminApp(): App {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        return existingApps[0];
    }

    // --- Production Environment (App Hosting) ---
    // In production, the service account key is provided as a secret environment variable.
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            // Ensure private_key format is correct, replacing escaped newlines.
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            return initializeApp({
                credential: cert(serviceAccount)
            });
        } catch (e: any) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from environment variable. Error: ${e.message}`);
        }
    }
    
    // --- Local Development Environment ---
    // In local dev, we look for a serviceAccountKey.json file in the root.
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return initializeApp({
                credential: cert(serviceAccount)
            });
        }
    } catch (e: any) {
        // This will catch errors from reading or parsing the file.
        throw new Error(`Failed to load or parse local serviceAccountKey.json. Please ensure it is a valid JSON file. Error: ${e.message}`);
    }

    // --- Fallback / Error State ---
    // If neither method works, throw a clear error.
    throw new Error(
        'Firebase Admin SDK initialization failed. For production, set the FIREBASE_SERVICE_ACCOUNT_KEY secret. For local development, place a valid `serviceAccountKey.json` file in your project root.'
    );
}

export function initializeAdmin() {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }

  return {
    db: getFirestore(adminApp),
    storage: getStorage(adminApp)
  };
}
