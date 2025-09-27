
'use server';

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

  const storageBucketUri = process.env.FIREBASE_STORAGE_BUCKET_GS_URI;
  if (!storageBucketUri) {
    throw new Error('FIREBASE_STORAGE_BUCKET_GS_URI environment variable is not set.');
  }

  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: storageBucketUri,
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
  // Errors will be thrown by actions if the SDK is not initialized.
}

export { adminApp, adminAuth, adminDb, adminStorage };
