
// This file is NOT a 'use server' file. It is a server-side utility module.
// It is safe to run on the server because it is only imported by server actions.

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

// Define a type for our singleton object
interface FirebaseAdminServices {
  app: App;
  auth: Auth;
  db: Firestore;
  storage: Storage;
}

// Use a global symbol to store the singleton instance to ensure it's unique
const ADMIN_APP_SYMBOL = Symbol.for('firebase.admin.app');

// Extend the NodeJS.Global interface to declare our global variable
declare global {
  var __firebase_admin_app__: FirebaseAdminServices | undefined;
}

function initializeAdminApp(): FirebaseAdminServices {
  // If the singleton instance is already on the global object, return it
  if (global.__firebase_admin_app__) {
    return global.__firebase_admin_app__;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please check your .env.local file.');
  }

  // Use the reliable client-side environment variable for the bucket name.
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in .env.local file');
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountString, 'base64').toString('utf8')
    );

    const newApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: storageBucket,
    }, 'firebase-admin-app');

    const services: FirebaseAdminServices = {
      app: newApp,
      auth: getAuth(newApp),
      db: getFirestore(newApp),
      storage: getStorage(newApp),
    };
    
    // Store the initialized services on the global object
    global.__firebase_admin_app__ = services;
    
    return services;

  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      console.warn("Firebase admin app already initialized, returning existing instance.");
      return global.__firebase_admin_app__!;
    }
     if (error instanceof SyntaxError) {
      console.error('Firebase Admin SDK initialization failed: The service account key is not valid JSON. Please ensure FIREBASE_SERVICE_ACCOUNT_KEY in .env.local is a correctly Base64-encoded service account JSON file.', error);
       throw new Error('Firebase Admin SDK initialization failed: Malformed service account key.');
    }
    console.error('Firebase Admin SDK initialization failed.', error);
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}

// Initialize and export the services. This will be a singleton.
const { app: adminApp, auth: adminAuth, db: adminDb, storage: adminStorage } = initializeAdminApp();

export { adminApp, adminAuth, adminDb, adminStorage };
