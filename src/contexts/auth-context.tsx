
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is the primary authentication listener.
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is authenticated with Firebase Auth. Now, let's find their profile in Firestore.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // This is the Firestore listener for the user's document.
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            // User document found, this is the successful case.
            setUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
          } else {
            // User is authenticated, but no document exists.
            // This is the problem state we are diagnosing.
            // We set the user to null because we don't have their profile info (tier, username, etc.)
            setUser(null); 
            console.warn(`User ${firebaseUser.uid} is authenticated, but no user document found in Firestore.`);
          }
          // We are no longer loading once we have an answer from Firestore (either it exists or it doesn't).
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        });

        // This function will be called when the user signs out.
        // It cleans up the Firestore listener.
        return () => unsubscribeDoc();
      } else {
        // User is signed out.
        setUser(null);
        setLoading(false);
      }
    });

    // This is the cleanup function for the main authentication listener.
    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
