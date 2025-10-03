'use client';

import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// --- Client-side Firebase Initialization ---

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FirebaseServices {
    app: FirebaseApp;
    db: Firestore;
    storage: FirebaseStorage;
}

// Use a global symbol to store the singleton instance to ensure it's unique across reloads in development.
const FIREBASE_APP_SYMBOL = Symbol.for('firebase.app');

declare global {
    var __firebase_app__: FirebaseServices | undefined;
}

function initializeWebApp(): FirebaseServices {
    if (process.env.NODE_ENV === 'development' && globalThis.__firebase_app__) {
        return globalThis.__firebase_app__;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const services: FirebaseServices = {
        app,
        db: getFirestore(app),
        storage: getStorage(app),
    };

    if (process.env.NODE_ENV === 'development') {
        globalThis.__firebase_app__ = services;
    }

    return services;
}

const { app, db, storage } = initializeWebApp();

// Export client modules
export { app, db, storage };
