
'use server';

import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert, App as AdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth, Auth as AdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage, Storage as AdminStorage } from 'firebase-admin/storage';

// --- Client-side Firebase Initialization ---

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Admin SDK Initialization (Server-side only) ---

let adminApp: AdminApp;
let adminAuth: AdminAuth;
let adminDb: AdminFirestore;
let adminStorage: AdminStorage;


if (getAdminApps().length === 0) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountString, 'base64').toString('utf8')
    );

    adminApp = initializeAdminApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    
    adminAuth = getAdminAuth(adminApp);
    adminDb = getAdminFirestore(adminApp);
    adminStorage = getAdminStorage(adminApp);

  } catch (e: any) {
    console.error('Firebase Admin SDK initialization failed:', e.message);
  }
} else {
  adminApp = getAdminApps()[0];
  adminAuth = getAdminAuth(adminApp);
  adminDb = getAdminFirestore(adminApp);
  adminStorage = getAdminStorage(adminApp);
}


// Export both client and admin modules
export { app, auth, db, storage, adminApp, adminAuth, adminDb, adminStorage };
