
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

export function initializeAdmin() {
  // If the app is already initialized, return the existing services.
  if (adminApp) {
    return { 
      db: getFirestore(adminApp), 
      storage: getStorage(adminApp) 
    };
  }

  // Check if there are any initialized apps, and if so, use the first one.
  // This prevents re-initialization errors in hot-reload environments.
  const alreadyCreated = getApps();
  if (alreadyCreated.length > 0) {
    adminApp = alreadyCreated[0];
    return { 
      db: getFirestore(adminApp), 
      storage: getStorage(adminApp) 
    };
  }

  // Read the service account key from the environment variable.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  let serviceAccount;
  try {
    // Parse the JSON string into a service account object.
    serviceAccount = JSON.parse(serviceAccountString);
  } catch (error: any) {
    const preview = serviceAccountString.substring(0, 20);
    throw new Error(`Failed to parse service account JSON. The string starts with: "${preview}". Please verify the secret's format. Original error: ${error.message}`);
  }

  try {
    // Initialize the Admin SDK with the parsed credential and correct storage bucket.
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: 'studio-7145415565-66e7d.firebasestorage.app',
    });
    
    // Return the initialized database and storage services.
    return { 
      db: getFirestore(adminApp), 
      storage: getStorage(adminApp) 
    };
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}
