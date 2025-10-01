
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

export function initializeAdmin() {
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

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please ensure it is configured in your hosting environment secrets.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountString);
  } catch (error: any) {
    const preview = serviceAccountString.substring(0, 40);
    throw new Error(`Failed to parse service account JSON. The string starts with: "${preview}". Please verify the secret's format. Original error: ${error.message}`);
  }
  
  // Further repair for the private_key specifically
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  try {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: 'studio-7145415565-66e7d.firebasestorage.app',
    });
    
    return { 
      db: getFirestore(adminApp), 
      storage: getStorage(adminApp) 
    };
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}
