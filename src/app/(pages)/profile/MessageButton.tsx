"use client";

import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function MessageButton({ otherUserId }: { otherUserId: string }) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);

  const startChat = async () => {
    if (!isSignedIn) return (window.location.href = '/');
    setLoading(true);
    try {
      const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({ otherUserId }), headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      if (data.chatId) router.push(`/messages/${data.chatId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={startChat} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
      Message
    </Button>
  );
}
