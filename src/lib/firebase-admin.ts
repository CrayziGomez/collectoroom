
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

function initializeAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    try {
      const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
      }
      
      const serviceAccount = JSON.parse(serviceAccountString);

      // The private_key in the service account JSON often has its newlines
      // escaped when stored in an environment variable (e.g., `\n` becomes `\\n`).
      // We need to replace these escaped newlines with actual newline characters.
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

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
