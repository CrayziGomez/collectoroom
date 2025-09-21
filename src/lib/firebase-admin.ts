
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

// This function ensures Firebase Admin is initialized only once.
function initializeAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
      }
      
      const serviceAccount = JSON.parse(serviceAccountKey);

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });

    } catch (e: any) {
      console.error('Firebase Admin SDK initialization failed.', e);
      throw new Error(`Firebase Admin SDK initialization failed: ${e.message}`);
    }
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}


export function getAdminInstances() {
  if (!adminApp) {
    initializeAdmin();
  }
  return { adminApp, adminAuth, adminDb };
}
