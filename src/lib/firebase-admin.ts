
// This file is NOT a 'use server' file. It is a server-side utility module.
// It is safe to run on the server because it is only imported by server actions.

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

interface FirebaseAdminSingleton {
  app: App;
  auth: Auth;
  db: Firestore;
  storage: Storage;
}

// This function ensures we initialize the app only once
function initializeAdminApp(): FirebaseAdminSingleton {
  // If an app is already initialized, return the existing services
  if (getApps().length > 0) {
    const existingApp = getApps()[0];
    return {
      app: existingApp,
      auth: getAuth(existingApp),
      db: getFirestore(existingApp),
      storage: getStorage(existingApp),
    };
  }

  // If no app is initialized, create a new one with the correct configuration
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountString, 'base64').toString('utf8')
    );

    // Use the reliable client-side environment variable for the bucket name.
    const bucketNameFromEnv = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketNameFromEnv) {
        throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set.');
    }

    const newApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: bucketNameFromEnv,
    });

    return {
      app: newApp,
      auth: getAuth(newApp),
      db: getFirestore(newApp),
      storage: getStorage(newApp),
    };
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed.', error);
    // In case of error, we can't provide functional services.
    // Throwing an error is appropriate as the server actions will not work.
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}

// Initialize and export the Firebase Admin services.
// This will either create a new app or get the existing one.
const { app: adminApp, auth: adminAuth, db: adminDb, storage: adminStorage } = initializeAdminApp();

export { adminApp, adminAuth, adminDb, adminStorage };
