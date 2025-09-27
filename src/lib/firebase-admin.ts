
// This file is NOT a 'use server' file. It is a server-side utility module.
// It is safe to run on the server because it is only imported by server actions.

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

// Define a type for our singleton object
interface FirebaseAdminSingleton {
  app: App;
  auth: Auth;
  db: Firestore;
  storage: Storage;
}

// This function ensures we initialize the app only once
function initializeAdminApp(): FirebaseAdminSingleton {
  if (getApps().length > 0) {
    const existingApp = getApps()[0];
    return {
      app: existingApp,
      auth: getAuth(existingApp),
      db: getFirestore(existingApp),
      storage: getStorage(existingApp),
    };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountString, 'base64').toString('utf8')
    );

    const bucketName = `${serviceAccount.project_id}.appspot.com`;

    const newApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: bucketName,
    });

    return {
      app: newApp,
      auth: getAuth(newApp),
      db: getFirestore(newApp),
      storage: getStorage(newApp),
    };
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed.', error);
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}

const { app: adminApp, auth: adminAuth, db: adminDb, storage: adminStorage } = initializeAdminApp();

export { adminApp, adminAuth, adminDb, adminStorage };
