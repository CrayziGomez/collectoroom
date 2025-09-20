
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type UserProfile = User & {
    tier: 'Hobbyist' | 'Explorer' | 'Collector' | 'Curator';
    isAdmin: boolean;
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
            ...firebaseUser,
            uid: firebaseUser.uid,
            username: userProfileData.username || firebaseUser.displayName || 'User',
            tier: userProfileData.tier,
            isAdmin: userProfileData.isAdmin,
            avatarUrl: userProfileData.avatarUrl || firebaseUser.photoURL || undefined,
          };
          setUser(userProfile);
        } else {
          // This case can happen for users created before firestore integration.
          // You might want to create a document here, or handle it as an incomplete profile.
          // For now, we'll create a basic profile.
           const basicProfile: UserProfile = {
            ...firebaseUser,
            username: firebaseUser.displayName || 'User',
            tier: 'Hobbyist',
            isAdmin: false,
            avatarUrl: firebaseUser.photoURL || undefined,
           };
           setUser(basicProfile);
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
