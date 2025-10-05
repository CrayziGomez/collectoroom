
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
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
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
