
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

export async function initializeAdmin() {
  if (adminApp) {
    return {
      db: getFirestore(adminApp),
      storage: getStorage(adminApp)
    };
  }

  const alreadyCreated = getApps();
  if (alreadyCreated.length > 0) {
    adminApp = alreadyCreated[0];
    return {
      db: getFirestore(adminApp),
      storage: getStorage(adminApp)
    };
  }

  // Check if running in the deployed Firebase App Hosting environment
  const isProduction = process.env.FIREBASERUN_WEB_APP_ID;

  if (isProduction) {
    // Production: Use the service account key from the environment variable
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set in the production environment. Please ensure it is configured in your hosting environment secrets.');
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountString);
    } catch (error: any) {
      throw new Error(`Failed to parse service account JSON in production. Please verify the secret's format. Original error: ${error.message}`);
    }

    // Correctly handle the private_key format
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    try {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: 'studio-7145415565-66e7d',
        // By not specifying storageBucket, the Admin SDK will use the default bucket for the project.
      });
    } catch (error: any) {
      throw new Error(`Failed to initialize Firebase Admin SDK in production: ${error.message}`);
    }
  } else {
    // Local Development: Use Application Default Credentials
    console.log("Service account key not found. Attempting to use Application Default Credentials for local development.");
    try {
      adminApp = initializeApp({
        projectId: 'studio-7145415565-66e7d',
         // By not specifying storageBucket, the Admin SDK will use the default bucket for the project.
      });
    } catch(error: any) {
        throw new Error(`Failed to initialize with Application Default Credentials. Please run 'gcloud auth application-default login' or ensure your local environment is authenticated. Original error: ${error.message}`);
    }
  }

  return {
    db: getFirestore(adminApp),
    storage: getStorage(adminApp)
  };
}
