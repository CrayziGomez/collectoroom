import * as admin from 'firebase-admin';
import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// IMPORTANT: This file is used on the server-side only.

// This is a professional and robust way to initialize the Firebase Admin SDK.
// It ensures that the app is only initialized once, preventing the 'duplicate-app' error.
const getAdminApp = (): App => {
  // If the app is already initialized, return it.
  if (getApps().length > 0) {
    return getApp();
  }

  // Otherwise, initialize the app with Application Default Credentials.
  // This is the standard and secure way for Google Cloud services to authenticate.
  return initializeApp();
};

// Export the admin services.
export const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
