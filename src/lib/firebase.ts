
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- Universal Firebase Initialization (Client & Server) ---

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;

// This function ensures that we initialize the app only once.
// It's safe to call on both the server and the client.
const getClientApp = () => {
    if (!app && getApps().length === 0) {
        // Explicitly provide the config, including the storage bucket, to ensure consistency.
        app = initializeApp(firebaseConfig);
    } else if (!app && getApps().length > 0) {
        app = getApp();
    }
    return app;
}

const db = getFirestore(getClientApp());
const storage = getStorage(getClientApp());

// Export client modules
export { app, db, storage, getClientApp };
