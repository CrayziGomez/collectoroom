
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
        // Use service account key if available (both in production and locally if set)
        try {
            const serviceAccount = JSON.parse(serviceAccountString);
            // Handle escaped newlines in the private key
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            return initializeApp({
                credential: cert(serviceAccount)
            });
        } catch (e: any) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Check .env.local file. Error: ${e.message}`);
        }
    } else {
        // Fallback for local development using Application Default Credentials
        console.log("FIREBASE_SERVICE_ACCOUNT_KEY not found. Using Application Default Credentials as a fallback.");
        try {
            return initializeApp();
        } catch(error: any) {
            throw new Error(`Failed to initialize with ADC. Run 'gcloud auth application-default login' or set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local. Error: ${error.message}`);
        }
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
