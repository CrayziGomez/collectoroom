
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
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
    // This listener handles all authentication state changes.
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in. Now, listen for their profile document in Firestore.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // onSnapshot creates a real-time subscription to the document.
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            // The document exists, so we set the user state.
            setUser(docSnap.data() as AppUser);
            setLoading(false);
          } else {
            // The document doesn't exist yet. This can happen for a brief moment
            // after signup while the backend Cloud Function is running.
            // We'll keep loading, and onSnapshot will fire again when the doc is created.
            // You might want to add a timeout here in a production app to handle
            // cases where the function fails.
            setLoading(true);
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        });

        // Return the cleanup function for the document listener.
        return () => unsubscribeDoc();
      } else {
        // User is signed out.
        setUser(null);
        setLoading(false);
      }
    });

    // Return the cleanup function for the auth state listener.
    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
