import * as admin from 'firebase-admin';
import { getApps, getApp, App } from 'firebase-admin/app';

// IMPORTANT: This file is used on the server-side only.
// It uses Application Default Credentials for authentication,
// which is the standard and secure way for Google Cloud services to authenticate.
// It no longer relies on a FIREBASE_SERVICE_ACCOUNT_KEY secret.

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // When running on App Hosting, the app is automatically initialized
  // with the environment's credentials.
  return admin.initializeApp();
}

export const adminDb = admin.firestore(getAdminApp());
export const adminAuth = admin.auth(getAdminApp());
export const adminStorage = admin.storage(getAdminApp());
