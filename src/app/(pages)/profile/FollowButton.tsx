"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { isSignedIn, user } = useUser();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/follow?targetUserId=${encodeURIComponent(targetUserId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setIsFollowing(Boolean(data.isFollowing));
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { mounted = false; };
  }, [targetUserId]);

  const toggle = async () => {
    if (!isSignedIn) {
      // Ideally trigger a signin flow; fallback: open sign-in
      window.location.href = '/';
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/follow', { method: 'POST', body: JSON.stringify({ targetUserId }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (res.ok && data.success) setIsFollowing(Boolean(data.isFollowing));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const Icon = isFollowing ? UserCheck : UserPlus;

  return (
    <Button variant="outline" onClick={toggle} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
