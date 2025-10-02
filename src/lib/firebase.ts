import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- Universal Firebase Initialization (Client & Server) ---

// In this version, we are explicitly NOT calling initializeApp from our code.
// We are assuming the Firebase App Hosting environment (or Next.js adapter)
// has ALREADY initialized the default Firebase App.
const getClientApp = () => {
    const apps = getApps();
    if (apps.length > 0) {
        return getApp(); // Always attempt to get the already initialized default app
    } else {
        // This scenario should ideally not be reached in Firebase App Hosting
        // if it's auto-initializing. If it is reached, it means NO app
        // has been initialized, which would imply a different problem.
        console.error("WARNING: No Firebase app found initialized by the environment. This might indicate an issue with Firebase App Hosting's auto-initialization or local development setup.");
        // If we reach here, it means the environment hasn't initialized an app,
        // which contradicts the 'duplicate-app' error. This would lead to a new type of error.
        throw new Error("Critical: No default Firebase app initialized by the environment. Cannot proceed.");
    }
}

// Initialize on module load, but using the guarded function
// This 'app' will be the default app initialized by the environment.
const app = getClientApp();
const db = getFirestore(app);
const storage = getStorage(app);

// Export client modules
export { app, db, storage, getClientApp };
