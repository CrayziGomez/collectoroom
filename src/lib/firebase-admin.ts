
'use server';

// This file is NOT a 'use server' file. It is a server-side utility module.
// It is safe to run on the server because it is only imported by server actions.
require('dotenv').config();

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;
let adminStorage: Storage | undefined;

try {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountString, 'base64').toString('utf8')
  );

  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    adminApp = getApps()[0];
  }

  if (adminApp) {
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    adminStorage = getStorage(adminApp);
  }

} catch (e: any) {
  console.error('Firebase Admin SDK initialization failed.', e);
  // This will cause actions to fail with the "not initialized" error if caught.
}

export { adminApp, adminAuth, adminDb, adminStorage };
