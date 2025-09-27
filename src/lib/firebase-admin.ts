
// This file is NOT a 'use server' file. It is a server-side utility module.
// It is safe to run on the server because it is only imported by server actions.

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;
let adminStorage: Storage;

try {
    if (!getApps().length) {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountString) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        }
        
        const serviceAccount = JSON.parse(
            Buffer.from(serviceAccountString, 'base64').toString('utf8')
        );

        const bucketName = `${serviceAccount.project_id}.appspot.com`;

        adminApp = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: bucketName,
        });
    } else {
        adminApp = getApps()[0];
    }
    
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    adminStorage = getStorage(adminApp);

} catch (e: any) {
  console.error('Firebase Admin SDK initialization failed.', e);
  // Re-throw the error to make it clear that initialization failed
  throw new Error(`Firebase Admin SDK initialization failed: ${e.message}`);
}

export { adminApp, adminAuth, adminDb, adminStorage };
