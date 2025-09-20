
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { MOCK_USERS } from '@/lib/constants'; // using mock for tier and isAdmin

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // In a real app, you would fetch user profile from Firestore here
        // For now, we'll merge with mock data to get tier, admin status, etc.
        const mockUser = MOCK_USERS.find(u => u.email === firebaseUser.email) || MOCK_USERS[0];
        const userProfile: UserProfile = {
            ...firebaseUser,
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || mockUser.username,
            tier: mockUser.tier,
            isAdmin: mockUser.isAdmin,
            avatarUrl: firebaseUser.photoURL || mockUser.avatarUrl,
        };
        setUser(userProfile);
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
