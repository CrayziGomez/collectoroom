
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';


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
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          setLoading(true);
          if (docSnap.exists()) {
            const appUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
            setUser({ ...appUser, firebaseUser });
            setLoading(false);
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
              // Explicitly set the user here to avoid race conditions
              setUser({ ...newUser, firebaseUser });
               sessionStorage.removeItem('pendingUsername');
               sessionStorage.removeItem('pendingTier');
            } catch (error) {
              console.error("Error creating user document:", error);
              setUser(null);
            } finally {
               setLoading(false);
            }
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
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
