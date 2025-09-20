
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
            // Document doesn't exist, this is likely a new user.
            // Let's create their document in Firestore.
            const username = firebaseUser.email?.split('@')[0] || 'New User';
            const tier = 'Hobbyist'; // Default tier
            const isAdmin = firebaseUser.email === 'admin@collectoroom.com'; // Check for admin email

            const newUser: AppUser = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid, // for mock data compatibility
              email: firebaseUser.email || '',
              username: username,
              tier: isAdmin ? 'Curator' : tier, // Admin gets Curator tier
              isAdmin: isAdmin,
            };

            try {
              await setDoc(userDocRef, newUser);
              // The onSnapshot listener below will pick up the new document.
            } catch (error) {
              console.error("Error creating user document:", error);
              setUser(null);
              setLoading(false);
              return; // Exit if document creation fails
            }
        }
        
        // Now, set up the real-time listener for the user document
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
          } else {
            // This case should be rare after the creation logic above, but it's good practice
            setUser(null);
          }
          setLoading(false);
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
