
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, getAuth } from 'firebase/auth';
import { db, app } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        // Sync avatarUrl on login if it's different
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
        // Document doesn't exist, create it
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
            // We throw here because subsequent operations will fail
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

  const updateUser = useCallback((data: Partial<AppUser>) => {
    setUser(currentUser => {
        if (!currentUser) return null;
        return {
            ...currentUser,
            ...data
        };
    });
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      // Clean up previous listener if it exists
      if (unsubscribeDoc) unsubscribeDoc();

      if (firebaseUser) {
        try {
          // Ensure user document exists before attaching a listener
          await createUserDocument(firebaseUser);
          
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const appUser = { uid: docSnap.id, ...docSnap.data() } as AppUser;
              setUser({ ...appUser, firebaseUser });
            } else {
              console.error("User document disappeared after creation.");
              setUser(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error listening to user document:", error);
            setUser(null);
            setLoading(false);
          });
        } catch (error) {
          console.error("Failed to setup user profile:", error);
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const contextValue = { user, loading, updateUser };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
