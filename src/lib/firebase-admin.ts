
import admin from 'firebase-admin';
import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const app = !getApps().length ? initializeApp() : getApp();

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);
const adminStorage = getStorage(app);

export { adminDb, adminAuth, adminStorage };
