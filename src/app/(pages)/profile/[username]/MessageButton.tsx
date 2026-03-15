'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function MessageButton({ otherUserId }: { otherUserId: string }) {
  const { user } = useAuth();

  if (!user || user.id === otherUserId) return null;

  return (
    <Button variant="outline" asChild>
      <Link href={`/messages?with=${otherUserId}`}>
        <MessageSquare className="mr-2 h-4 w-4" />
        Message
      </Link>
    </Button>
  );
}
