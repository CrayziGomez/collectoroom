
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminInstances: { adminApp: App; adminAuth: Auth; adminDb: Firestore; } | null = null;

export function getAdminInstances() {
    if (adminInstances) {
        return adminInstances;
    }

    if (getApps().length === 0) {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        }
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            const app = initializeApp({
                credential: cert(serviceAccount),
            });
            const auth = getAuth(app);
            const db = getFirestore(app);
            adminInstances = { adminApp: app, adminAuth: auth, adminDb: db };
        } catch (e: any) {
            console.error('Failed to parse or initialize Firebase Admin SDK from environment variable.', e.message);
            throw new Error('Firebase Admin SDK initialization failed. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string.');
        }
    } else {
        const app = getApps()[0];
        const auth = getAuth(app);
        const db = getFirestore(app);
        adminInstances = { adminApp: app, adminAuth: auth, adminDb: db };
    }
    
    return adminInstances;
}
