
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, app } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
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

async function createUserDocument(user: FirebaseUser) {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
        const username = sessionStorage.getItem('pendingUsername') || user.email?.split('@')[0] || 'New User';
        const tier = sessionStorage.getItem('pendingTier') || 'Hobbyist';
        const isAdmin = user.email === 'admin@collectoroom.com';

        const newUser: AppUser = {
            uid: user.uid,
            id: user.uid,
            email: user.email || '',
            username: username,
            tier: isAdmin ? 'Curator' : (tier as AppUser['tier']),
            isAdmin: isAdmin,
            followerCount: 0,
            followingCount: 0,
        };

        try {
            await setDoc(userDocRef, newUser);
        } catch (error) {
            console.error("Error creating user document:", error);
        } finally {
            // Clean up session storage
            sessionStorage.removeItem('pendingUsername');
            sessionStorage.removeItem('pendingTier');
        }
    }
}


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

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      let unsubscribeDoc: (() => void) | null = null;
      setLoading(true);

      if (firebaseUser) {
        // Create user document if it doesn't exist. This is idempotent.
        await createUserDocument(firebaseUser);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const appUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
            setUser({ ...appUser, firebaseUser });
          } else {
             // Should not happen often if createUserDocument works, but good to have
             console.log('User document not found, waiting for creation...');
          }
          setLoading(false);
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
