
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
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot to listen for real-time updates to the user document.
        // This is crucial for when the document is created by a backend function.
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as AppUser);
          } else {
            // Document might not be created yet by the backend function.
            // We don't set user to null here immediately, we just wait.
            // If the document never appears, the user won't be set, and they'll be treated as logged out.
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user document:", error);
          setUser(null);
          setLoading(false);
        });

        // Return a cleanup function for the document snapshot listener.
        return () => unsubscribeDoc();

      } else {
        // No Firebase user.
        setUser(null);
        setLoading(false);
      }
    });

    // Return a cleanup function for the auth state listener.
    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
