
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import type { User as AppUser } from '@/lib/types';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    const syncUser = async () => {
      setLoading(true);
      if (!isLoaded) {
        console.debug('AuthContext: Clerk not loaded yet', { isLoaded, isSignedIn });
        setLoading(false);
        return;
      }

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
          avatarUrl: clerkUser.profileImageUrl || ''
        };

        setUser(mapped);

        // optional: fetch application profile from backend
        try {
          const res = await fetch(`/api/users/${clerkUser.id}`);
          if (res.ok) {
            const json = await res.json();
            setUser(prev => ({ ...(prev || {}), ...json } as AppUser));
            if (json.isAdmin) router.push('/admin');
            else router.push('/my-collectoroom');
          }
        } catch (e) {
          // ignore - backend may not exist yet
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    syncUser();
  }, [isLoaded, isSignedIn, clerkUser, router]);

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
