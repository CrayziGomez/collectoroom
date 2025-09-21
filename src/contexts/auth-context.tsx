
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
  const [authLoading, setAuthLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false); // Tracks loading of the user doc from Firestore

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setUserLoading(true); // Start loading user doc
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const appUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
            setUser({ ...appUser, firebaseUser });
            setUserLoading(false); // Stop loading user doc
            setAuthLoading(false); // Auth process is complete
          } else {
            // Document doesn't exist, this is likely a new user.
            const username = firebaseUser.email?.split('@')[0] || 'New User';
            const tier = sessionStorage.getItem('pendingTier') || 'Hobbyist';
            const isAdmin = firebaseUser.email === 'admin@collectoroom.com';

            const newUser: AppUser = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid, // for mock data compatibility
              email: firebaseUser.email || '',
              username: sessionStorage.getItem('pendingUsername') || username,
              tier: isAdmin ? 'Curator' : (tier as AppUser['tier']),
              isAdmin: isAdmin,
              followerCount: 0,
              followingCount: 0,
            };

            try {
              await setDoc(userDocRef, newUser);
              // The onSnapshot listener will fire again with the new doc,
              // so we don't need to set user state here. We just wait.
              sessionStorage.removeItem('pendingUsername');
              sessionStorage.removeItem('pendingTier');
            } catch (error) {
              console.error("Error creating user document:", error);
              setUser(null);
              setUserLoading(false);
              setAuthLoading(false);
            }
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setUserLoading(false);
          setAuthLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setAuthLoading(false);
        setUserLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const contextValue = {
    user,
    loading: authLoading || userLoading, // The app is loading if either auth or user doc is loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
