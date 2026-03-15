
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

interface ToggleFollowAction {
  (params: { targetUserId: string; currentUserId: string }): Promise<any>;
}

function UserRow({ userToList, currentUser }: { userToList: any; currentUser: User }) {
  return (
    <div className="flex items-center p-4">
      <Link href={`/profile/${userToList.username}`} className="flex items-center gap-4 group">
        <Avatar>
          <AvatarImage src={userToList.avatarUrl} alt={userToList.username} />
          <AvatarFallback>{userToList.username?.charAt(0)}</AvatarFallback>
        </Avatar>
        <p className="font-semibold group-hover:text-primary transition-colors">{userToList.username}</p>
      </Link>
    </div>
  );
}

export function ConnectionsPageClient({ toggleFollowAction }: { toggleFollowAction: ToggleFollowAction }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [following, setFollowing] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/connections`);
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following || []);
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchConnections();
  }, [user, authLoading, router, fetchConnections]);

  if (authLoading || loading || !user) {
    return (
      <div className="container py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/my-collectoroom">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My CollectoRoom
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold font-headline mb-6">Connections</h1>
      <Tabs defaultValue="following">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
          <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="following">
          <Card><CardContent className="p-0">
            {following.length > 0
              ? <div className="divide-y">{following.map(f => <UserRow key={f.id} userToList={f} currentUser={user} />)}</div>
              : <p className="p-8 text-center text-muted-foreground">You are not following anyone yet.</p>}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="followers">
          <Card><CardContent className="p-0">
            {followers.length > 0
              ? <div className="divide-y">{followers.map(f => <UserRow key={f.id} userToList={f} currentUser={user} />)}</div>
              : <p className="p-8 text-center text-muted-foreground">You have no followers yet.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
