
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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        // User is signed in. Listen for their document in Firestore.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            // The document exists, set the user state.
            setUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
            setLoading(false);
          } else {
            // Document doesn't exist. This is expected for a moment after signup
            // while the backend function runs. We'll simply wait.
            // If it persists, it means the function failed or hasn't run.
            // A production app might have a timeout here.
            console.log("User is authenticated, but user document does not exist yet. Waiting for backend function...");
            setUser(null); // Ensure no stale user data
            setLoading(true); // Continue loading until doc appears or user signs out
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        });

        return () => unsubscribeDoc(); // Cleanup Firestore listener
      } else {
        // User is signed out.
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup auth listener
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
