
import admin from 'firebase-admin';
import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

const BUCKET_NAME = 'collectoroom-proj-we4.firebasestorage.app';

// Determine the correct path to the service account key
const serviceAccountPath = path.resolve('./serviceAccountKey.json');

let app;

if (!getApps().length) {
  if (process.env.NODE_ENV === 'production') {
    // In production, use Application Default Credentials.
    app = initializeApp({
        storageBucket: BUCKET_NAME
    });
  } else {
    // In development, use the local service account key if it exists
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      app = initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: BUCKET_NAME
      });
    } else {
      console.warn('serviceAccountKey.json not found. Initializing with default credentials for local development.');
      // Fallback to default initialization, but ensure the bucket is still specified.
      app = initializeApp({
        storageBucket: BUCKET_NAME
      });
    }
  }
} else {
  app = getApp();
}


const adminDb = getFirestore(app);
const adminAuth = getAuth(app);
const adminStorage = getStorage(app);

export { adminDb, adminAuth, adminStorage };
