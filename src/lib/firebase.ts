
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  "projectId": "studio-7145415565-66e7d",
  "appId": "1:47670381092:web:6e67a8da3455b65518a6b1",
  "apiKey": "AIzaSyD81Q7lwEparRgB4pRKq5ezOuS2KzrMLMk",
  "authDomain": "studio-7145415565-66e7d.firebaseapp.com",
  "messagingSenderId": "47670381092"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
