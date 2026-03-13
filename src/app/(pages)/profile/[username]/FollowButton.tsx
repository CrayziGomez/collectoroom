'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { toggleFollow } from '@/app/actions/user-actions';
import { Loader2 } from 'lucide-react';

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!user || user.id === targetUserId) return null;

  function handleClick() {
    if (!user) return;
    startTransition(async () => {
      const res = await toggleFollow({ targetUserId, currentUserId: user.id });
      if (res.success) setIsFollowing(res.isFollowing);
    });
  }

  return (
    <Button variant={isFollowing ? 'outline' : 'default'} onClick={handleClick} disabled={isPending}>
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
