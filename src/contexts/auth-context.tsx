
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onIdTokenChanged, User as FirebaseUser, getAuth } from 'firebase/auth';
import { db, app } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface EnrichedFirebaseUser extends FirebaseUser {
    isAdmin?: boolean;
}

interface AppUserWithFirebase extends AppUser {
    firebaseUser: EnrichedFirebaseUser | null;
}

interface AuthContextType {
  user: AppUserWithFirebase | null;
  loading: boolean;
  updateUser: (data: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    updateUser: () => {}
});

async function createUserDocument(user: FirebaseUser): Promise<AppUser> {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const existingData = docSnap.data() as AppUser;
        if (user.photoURL && existingData.avatarUrl !== user.photoURL) {
            try {
                await updateDoc(userDocRef, { avatarUrl: user.photoURL });
                return { ...existingData, avatarUrl: user.photoURL };
            } catch (error) {
                console.error("Error syncing avatar on login:", error);
                return existingData;
            }
        }
        return existingData;
    } else {
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
            avatarUrl: user.photoURL || '',
        };
        
        try {
            await setDoc(userDocRef, { ...newUser, createdAt: serverTimestamp() });
        } catch (error) {
            console.error("Error creating user document:", error);
            throw new Error("Failed to create user profile.");
        } finally {
            sessionStorage.removeItem('pendingUsername');
            sessionStorage.removeItem('pendingTier');
        }
        return newUser;
    }
}

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUserWithFirebase | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const updateUser = useCallback((data: Partial<AppUser>) => {
    setUser(currentUser => {
        if (!currentUser) return null;
        return { ...currentUser, ...data };
    });
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (unsubscribeDoc) unsubscribeDoc();

      if (firebaseUser) {
        try{
            const idTokenResult = await firebaseUser.getIdTokenResult();
            const appUser = await createUserDocument(firebaseUser);
            const isAdmin = idTokenResult.claims.isAdmin === true;
            setUser({ ...appUser, isAdmin, firebaseUser});

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const updatedUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
                    setUser(currentUser => currentUser ? { ...currentUser, ...updatedUser, isAdmin } : null);
                }
            });

            if (isAdmin) {
                router.push('/admin');
            } else {
                router.push('/my-collectoroom');
            }
        } catch (error: any) {
            if (error.code === 'auth/id-token-revoked') {
                // Token has been revoked, force a refresh.
                await firebaseUser.getIdToken(true);
            } else {
                console.error("Auth context error:", error);
                setUser(null);
            }
        } finally {
            setLoading(false);
        }

      } else {
        setUser(null);
        setLoading(false);
        try {
          await fetch('/api/auth', { method: 'DELETE' });
        } catch (error) {
          console.error('Failed to clear session:', error);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, [router]);

  const contextValue = { user, loading, updateUser };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
