import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- Universal Firebase Initialization (Client & Server) ---

const getFirebaseConfig = (): FirebaseOptions => {
  // --- IMPORTANT DEBUGGING LOGS ---
  console.log("DEBUG: BUILD_ENV_NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log("DEBUG: BUILD_ENV_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.log("DEBUG: BUILD_ENV_NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log("DEBUG: BUILD_ENV_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  console.log("DEBUG: BUILD_ENV_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
  console.log("DEBUG: BUILD_ENV_NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
  // --- END DEBUGGING LOGS ---

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
};

// Use a module-scoped variable to hold the initialized app instance
let initializedAppInstance: any = null;

const getClientApp = () => {
    // If an app is already initialized in this module scope, return it
    if (initializedAppInstance) {
        return initializedAppInstance;
    }

    // Check if any app is already initialized globally by Firebase SDK
    const apps = getApps();
    if (apps.length > 0) {
        initializedAppInstance = getApp(); // Use the existing app
        return initializedAppInstance;
    } else {
        // Only initialize if no app exists globally or in this module scope
        const firebaseConfig = getFirebaseConfig(); // Get config with logging
        initializedAppInstance = initializeApp(firebaseConfig);
        return initializedAppInstance;
    }
}

// Initialize on module load, but using the guarded function
const app = getClientApp();
const db = getFirestore(app);
const storage = getStorage(app);

// Export client modules
export { app, db, storage, getClientApp };
