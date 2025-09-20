
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          setLoading(true);
          if (docSnap.exists()) {
            setUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
            setLoading(false);
          } else {
            // Document doesn't exist, this is likely a new user.
            // Let's create their document in Firestore.
            const username = sessionStorage.getItem('pendingUsername') || firebaseUser.email?.split('@')[0] || 'New User';
            const tier = (sessionStorage.getItem('pendingTier') as AppUser['tier']) || 'Hobbyist';
            
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid, // for mock data compatibility
              email: firebaseUser.email || '',
              username: username,
              tier: tier,
              isAdmin: false,
            };

            try {
              await setDoc(userDocRef, newUser);
              // The onSnapshot listener will fire again with the new document.
              // Clean up session storage
              sessionStorage.removeItem('pendingUsername');
              sessionStorage.removeItem('pendingTier');
            } catch (error) {
              console.error("Error creating user document:", error);
              setUser(null); // Failed to create doc, so treat as logged out
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
