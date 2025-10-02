import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- Universal Firebase Initialization (Client & Server) ---

const getFirebaseConfig = (): FirebaseOptions => {
  if (!process.env.FIREBASE_WEBAPP_CONFIG) {
    // This case should ideally not happen in Firebase App Hosting
    // but provides a fallback for local dev if FIREBASE_WEBAPP_CONFIG isn't set.
    console.error("FIREBASE_WEBAPP_CONFIG is not set. Falling back to NEXT_PUBLIC_* env variables.");
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }

  try {
    const config = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    // Ensure the storageBucket from FIREBASE_WEBAPP_CONFIG is correct
    // The previous logs show storageBucket from FIREBASE_WEBAPP_CONFIG is correct,
    // but this guard ensures it.
    if (config.projectId && !config.storageBucket) {
        config.storageBucket = `${config.projectId}.firebasestorage.app`;
    } else if (config.storageBucket && !config.storageBucket.includes('firebasestorage.app')) {
        // Correct potential firebaseapp.com mistake in storageBucket from FIREBASE_WEBAPP_CONFIG
        config.storageBucket = `${config.projectId}.firebasestorage.app`;
    }
    return config;
  } catch (e) {
    console.error("Failed to parse FIREBASE_WEBAPP_CONFIG:", e);
    // This indicates a malformed FIREBASE_WEBAPP_CONFIG. Build should fail.
    throw new Error("Critical: Invalid FIREBASE_WEBAPP_CONFIG provided by hosting environment.");
  }
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
        const firebaseConfig = getFirebaseConfig(); // Get config with logic
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
