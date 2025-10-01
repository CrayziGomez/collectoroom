
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

function initializeAdminApp(): App {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        return existingApps[0];
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountString) {
        // Production or environment with explicit service account key
        try {
            const serviceAccount = JSON.parse(serviceAccountString);
            // Handle escaped newlines in the private key
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            return initializeApp({
                credential: cert(serviceAccount),
                projectId: 'studio-7145415565-66e7d',
            });
        } catch (e: any) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${e.message}`);
        }
    } else {
        // Local development using Application Default Credentials
        console.log("FIREBASE_SERVICE_ACCOUNT_KEY not found. Using Application Default Credentials.");
        return initializeApp({
             projectId: 'studio-7145415565-66e7d',
        });
    }
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
