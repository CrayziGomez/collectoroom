
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // The onSnapshot listener will handle the user state.
        // We don't need to do anything here except set up the listener.
        const unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          setLoading(true); // Start loading when we get a new snapshot
          if (docSnap.exists()) {
            const appUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
            setUser({ ...appUser, firebaseUser });
            setLoading(false); // Only stop loading after user is fully loaded
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
              // After setting the doc, the onSnapshot listener above will fire,
              // so we don't need to set the user here. We just wait for the update.
               sessionStorage.removeItem('pendingUsername');
               sessionStorage.removeItem('pendingTier');
            } catch (error) {
              console.error("Error creating user document:", error);
              setUser(null);
              setLoading(false); // Stop loading on error
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
