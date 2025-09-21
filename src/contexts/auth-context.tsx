
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

  useEffect(() => {
    // onAuthStateChanged returns an unsubscriber
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      let unsubscribeDoc: (() => void) | null = null;
      setLoading(true);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const appUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
            setUser({ ...appUser, firebaseUser });
            setLoading(false);
          } else {
            // New user scenario
            const username = firebaseUser.email?.split('@')[0] || 'New User';
            const tier = sessionStorage.getItem('pendingTier') || 'Hobbyist';
            const isAdmin = firebaseUser.email === 'admin@collectoroom.com';

            const newUser: AppUser = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              username: sessionStorage.getItem('pendingUsername') || username,
              tier: isAdmin ? 'Curator' : (tier as AppUser['tier']),
              isAdmin: isAdmin,
              followerCount: 0,
              followingCount: 0,
            };

            try {
              await setDoc(userDocRef, newUser);
              // The onSnapshot listener will then fire with the new data, setting loading to false.
              sessionStorage.removeItem('pendingUsername');
              sessionStorage.removeItem('pendingTier');
            } catch (error) {
              console.error("Error creating user document:", error);
              setUser(null);
              setLoading(false);
            }
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        });
      } else {
        // User is not logged in
        setUser(null);
        setLoading(false);
      }
      
      // Return a cleanup function that unsubscribes from both auth and doc listeners
      return () => {
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
      };
    });

    // Cleanup the auth listener when the component unmounts
    return () => unsubscribeAuth();
  }, []);

  const contextValue = { user, loading };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

