
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import type { User as AppUser } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  updateUser: (data: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  updateUser: async () => {}
});

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoaded) {
        // Clerk is still initialising — keep loading: true so guards don't fire prematurely
        setLoading(true);
        return;
      }
      setLoading(true);

      if (isSignedIn && clerkUser) {
        const mapped: AppUser = {
          id: clerkUser.id,
          uid: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '',
          username: (clerkUser.username as string) || clerkUser.firstName || clerkUser.fullName || '',
          tier: 'Hobbyist',
          isAdmin: false,
          followerCount: 0,
          followingCount: 0,
          avatarUrl: clerkUser.imageUrl || ''
        };

        setUser(mapped);

        // Fetch app-specific profile (admin flag, counters, etc.)
        try {
          const res = await fetch(`/api/users/${clerkUser.id}`);
          if (res.ok) {
            const json = await res.json();
            setUser(prev => ({ ...(prev || {}), ...json } as AppUser));
          }
        } catch (e) {
          // ignore - backend may not be reachable
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    syncUser();
  }, [isLoaded, isSignedIn, clerkUser]);

  const updateUser = useCallback(async (data: Partial<AppUser>) => {
    setUser(current => current ? { ...current, ...data } : current);
    try {
      if (user?.id) {
        await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      }
    } catch (e) {
      // ignore
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
