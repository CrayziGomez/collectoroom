// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

function getAdminInstances() {
    if (!getApps().length) {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        }
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            adminApp = initializeApp({
                credential: cert(serviceAccount),
            });
            adminAuth = getAuth(adminApp);
            adminDb = getFirestore(adminApp);
        } catch (e: any) {
            console.error('Failed to parse or initialize Firebase Admin SDK from environment variable.', e.message);
            throw new Error('Firebase Admin SDK initialization failed. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string.');
        }
    } else {
        adminApp = getApps()[0];
        adminAuth = getAuth(adminApp);
        adminDb = getFirestore(adminApp);
    }
    return { adminApp, adminAuth, adminDb };
}

export { getAdminInstances };
