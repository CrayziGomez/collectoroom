
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, app } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';


interface EnrichedFirebaseUser extends FirebaseUser {
    isAdmin?: boolean;
}

interface AppUserWithFirebase extends AppUser {
    firebaseUser: EnrichedFirebaseUser | null;
}


interface AuthContextType {
  user: AppUserWithFirebase | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUserWithFirebase | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  
  useEffect(() => {
    if(app) {
        setFirebaseInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      let unsubscribeDoc: (() => void) | null = null;
      setLoading(true);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const appUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
            setUser({ ...appUser, firebaseUser });
            setLoading(false);
          } else {
            // Document might not exist yet if the Cloud Function is still running.
            // We'll keep loading until the document appears.
            // A timeout could be added here to handle cases where the function fails.
            console.log('User document not found, waiting for creation...');
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
      
      return () => {
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
      };
    });

    return () => unsubscribeAuth();
  }, [firebaseInitialized]);

  const contextValue = { user, loading };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
