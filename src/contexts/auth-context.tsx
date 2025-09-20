
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, getCountFromServer, collection } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// This function runs once when the user is authenticated for the first time.
// It creates the user document in Firestore.
const createUserProfileDocument = async (firebaseUser: FirebaseUser) => {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userSnapshot = await getDoc(userDocRef);

  // Check if the user document already exists
  if (!userSnapshot.exists()) {
    const { email } = firebaseUser;
    
    // Get pending data from session storage (set during signup)
    const pendingProfileString = sessionStorage.getItem('pendingUserProfile');
    const pendingProfile = pendingProfileString ? JSON.parse(pendingProfileString) : {};
    const username = pendingProfile.username || email?.split('@')[0] || 'Anonymous';
    const tier = pendingProfile.tier || 'Hobbyist';
    
    // Check if this is the first user ever
    const usersCollectionRef = collection(db, "users");
    const snapshot = await getCountFromServer(usersCollectionRef);
    const isFirstUser = snapshot.data().count === 0;

    const newUser: AppUser = {
      uid: firebaseUser.uid,
      email: email || '',
      username: username,
      tier: tier,
      isAdmin: isFirstUser, // Make the first user an admin
      // Initialize other fields as needed
      id: firebaseUser.uid, 
    };

    try {
      await setDoc(userDocRef, newUser);
      sessionStorage.removeItem('pendingUserProfile'); // Clean up session storage
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  }
};


export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in.
        await createUserProfileDocument(firebaseUser); // Ensure profile exists
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as AppUser);
          } else {
             // This might happen in a brief moment before the doc is created.
             // We don't set user to null here, we just wait for the doc to appear.
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user document:", error);
          setUser(null);
          setLoading(false);
        });

        return () => unsubscribeDoc();

      } else {
        // User is signed out.
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
