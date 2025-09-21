
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "APIKEY",
  authDomain: "nextn-33230.firebaseapp.com",
  projectId: "nextn-33230",
  storageBucket: "nextn-33230.appspot.com",
  messagingSenderId: "831317065634",
  appId: "1:831317065634:web:8067ce9553f86c29995133"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
