
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import type { PricingTier } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// This function runs once on the client to create the user document if needed.
const createUserDocument = async (firebaseUser: FirebaseUser) => {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);

  // If the document already exists, we don't need to do anything.
  if (userDoc.exists()) {
    return;
  }

  // Check if this is the very first user.
  const usersCollectionRef = collection(db, 'users');
  const existingUsers = await getDocs(usersCollectionRef);
  const isFirstUser = existingUsers.empty;

  // Get the pending user info from session storage, which was set during signup.
  const username = sessionStorage.getItem('pendingUsername') || 'New User';
  const tier = (sessionStorage.getItem('pendingTier') as AppUser['tier']) || 'Hobbyist';

  const newUser: AppUser = {
    uid: firebaseUser.uid,
    id: firebaseUser.uid, // Using uid for id as well for consistency
    email: firebaseUser.email!,
    username: username,
    tier: tier,
    isAdmin: isFirstUser, // Make the first user an admin
  };

  try {
    // Create the document. This runs after the user is fully authenticated.
    await setDoc(userDocRef, newUser);
  } finally {
    // Clean up session storage items
    sessionStorage.removeItem('pendingUsername');
    sessionStorage.removeItem('pendingTier');
  }
};


export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in.
        // Ensure their user document exists. This handles the first-time signup case.
        await createUserDocument(firebaseUser);

        // Now, set up a real-time listener for their document.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as AppUser);
          } else {
            // This can happen briefly if the document creation is slow.
            // We'll let createUserDocument handle it and this listener will pick up the change.
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        // User is signed out.
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
