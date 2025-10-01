
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

function initializeAdminApp(): App {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        return existingApps[0];
    }

    let serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountString) {
        try {
            // Most common issue: .env file has quotes around the JSON string.
            // This removes them if they exist.
            if (serviceAccountString.startsWith("'") && serviceAccountString.endsWith("'")) {
                serviceAccountString = serviceAccountString.substring(1, serviceAccountString.length - 1);
            }

            const serviceAccount = JSON.parse(serviceAccountString);
            
            // Handle escaped newlines in the private key, a common issue with env vars.
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            return initializeApp({
                credential: cert(serviceAccount)
            });

        } catch (e: any) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Check .env.local format. Error: ${e.message}`);
        }
    } else {
        // Fallback for local development when the service account key is not in .env.local
        console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local. Falling back to Application Default Credentials. This may cause issues with services like URL signing.");
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
