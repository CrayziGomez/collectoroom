
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';


type UserProfile = AppUser & {
    uid: string;
    email: string;
    username: string;
    avatarUrl?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userProfileData = userDocSnap.data();
           const userProfile: UserProfile = {
            id: firebaseUser.uid, // from lib/types
            uid: firebaseUser.uid,
            username: userProfileData.username || firebaseUser.displayName || 'User',
            email: userProfileData.email || firebaseUser.email!,
            tier: userProfileData.tier,
            isAdmin: userProfileData.isAdmin,
            avatarUrl: userProfileData.avatarUrl || firebaseUser.photoURL || undefined,
          };
          setUser(userProfile);
        } else {
           console.log('No user document found, creating one...');
           const newUserProfile: UserProfile = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || 'Anonymous User',
            email: firebaseUser.email!,
            tier: 'Hobbyist', // Default tier
            isAdmin: false, // Default to not admin
            avatarUrl: firebaseUser.photoURL || undefined,
           };
           try {
            await setDoc(userDocRef, newUserProfile);
            setUser(newUserProfile);
           } catch (error) {
            console.error("Error creating user document:", error);
           }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
