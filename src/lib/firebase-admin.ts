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

// Use a global symbol to store the singleton instance to ensure it's unique across reloads in development.
const ADMIN_APP_SYMBOL = Symbol.for('firebase.admin.app');

// Extend the NodeJS.Global interface to declare our global variable
declare global {
  var __firebase_admin_app__: FirebaseAdminServices | undefined;
}

function initializeAdminApp(): FirebaseAdminServices {
    // In development, hot-reloading can cause this file to be re-evaluated.
    // We use a global symbol to preserve the initialized app across reloads.
    if (process.env.NODE_ENV === 'development' && global.__firebase_admin_app__) {
        return global.__firebase_admin_app__;
    }

    // Check if the app is already initialized. This is the standard way to handle this.
    if (getApps().length > 0) {
        const existingApp = getApps()[0];
        const services: FirebaseAdminServices = {
            app: existingApp,
            auth: getAuth(existingApp),
            db: getFirestore(existingApp),
            storage: getStorage(existingApp),
        };
        // Also store it on the global for subsequent dev reloads
        if (process.env.NODE_ENV === 'development') {
            global.__firebase_admin_app__ = services;
        }
        return services;
    }

    // --- Robust Diagnostic Steps ---
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('DIAGNOSTIC: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or empty.');
    }
    
    let decodedKey: string;
    try {
        decodedKey = Buffer.from(serviceAccountString, 'base64').toString('utf8');
    } catch (error: any) {
        throw new Error(`DIAGNOSTIC: Failed to decode Base64 service account key. Error: ${error.message}`);
    }

    let serviceAccount: object;
    try {
        serviceAccount = JSON.parse(decodedKey);
    } catch (error: any) {
        throw new Error(`DIAGNOSTIC: Failed to parse service account key from decoded JSON. Error: ${error.message}`);
    }

    const projectId = "studio-7145415565-66e7d";
    const storageBucket = "studio-7145415565-66e7d.firebasestorage.app";

    try {
        const newApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: projectId,
            storageBucket: storageBucket,
        });

        const services: FirebaseAdminServices = {
            app: newApp,
            auth: getAuth(newApp),
            db: getFirestore(newApp),
            storage: getStorage(newApp),
        };
        
        if (process.env.NODE_ENV === 'development') {
            global.__firebase_admin_app__ = services;
        }
        
        return services;

    } catch (error: any) {
        // This is the critical diagnostic block.
        // We re-throw the error with a clear prefix to ensure it's visible in the logs.
        console.error('CRITICAL: Firebase Admin SDK initializeApp failed.', error);
        throw new Error(`DIAGNOSTIC_ERROR: Firebase Admin initializeApp failed with error: "${error.message}"`);
    }
}

// Initialize and export the services. This will be a singleton.
const { app: adminApp, auth: adminAuth, db: adminDb, storage: adminStorage } = initializeAdminApp();

export { adminApp, adminAuth, adminDb, adminStorage };
