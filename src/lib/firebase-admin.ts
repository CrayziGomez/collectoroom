
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

interface FirebaseAdminServices {
  app: App;
  auth: Auth;
  db: Firestore;
  storage: Storage;
}

// This function ensures that we initialize the app only once.
export function initializeAdminApp(): FirebaseAdminServices {
  const alreadyCreated = getApps();
  const app = alreadyCreated.length > 0 ? alreadyCreated[0] : _initialize();
  
  return {
    app: app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}

function _initialize(): App {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }

    try {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
        return initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    } catch (error: any) {
        throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
}

// We can still export a default instance for convenience, 
// but our actions will now call the function directly.
const { db: adminDb } = initializeAdminApp();
export { adminDb };

    