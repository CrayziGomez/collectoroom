
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

function initializeAdminApp(): App {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        return existingApps[0];
    }

    // This logic now assumes the service account key is always available as an environment variable.
    // This is true in the deployed App Hosting environment (via secrets)
    // and should be true locally if .env.local is set up correctly.
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountString) {
        // This is a critical failure. The app cannot run without server-side authentication.
        throw new Error(
            'CRITICAL_ERROR: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. ' +
            'For local development, ensure the key is correctly set in your .env.local file. ' +
            'For production, ensure the secret is configured in your App Hosting backend.'
        );
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        
        // Ensure private_key format is correct, replacing escaped newlines.
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        return initializeApp({
            credential: cert(serviceAccount)
        });

    } catch (e: any) {
        throw new Error(`Failed to parse or use FIREBASE_SERVICE_ACCOUNT_KEY. Please verify its format. Error: ${e.message}`);
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
