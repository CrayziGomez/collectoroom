
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/spinner';

const AdminPageClient = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !user.isAdmin) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Show spinner and helpful debug info to diagnose why auth/profile isn't resolving
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <div className="flex items-center">
          <Spinner />
        </div>
        <div className="text-sm text-muted-foreground max-w-xl text-center px-4">
          Loading user profile — if this takes long, check Network → <code>/api/users/&lt;id&gt;</code> and Clerk authentication state in the console.
        </div>
        <details className="text-xs text-muted-foreground max-w-xl p-2">
          <summary className="cursor-pointer">Debug: auth state</summary>
          <pre className="text-xs max-h-48 overflow-auto">{JSON.stringify({ loading, user }, null, 2)}</pre>
        </details>
      </div>
    );
  }

  if (user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <p className="text-lg">Welcome, {user.username}. You have full administrative privileges.</p>
        {/* Future admin-specific components will be placed here */}
      </div>
    );
  }

  return null;
};

export default AdminPageClient;
