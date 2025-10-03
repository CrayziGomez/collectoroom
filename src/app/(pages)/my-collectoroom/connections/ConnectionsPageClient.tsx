
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useFollow } from '@/hooks/use-follow';


// Define the type for the server action
interface ToggleFollowAction {
    (params: { targetUserId: string; currentUserId: string; }): Promise<any>;
}

// A component for a single user row, including the follow button
function UserRow({ userToList, currentUser, onFollowToggle, toggleFollowAction }: { userToList: User, currentUser: User, onFollowToggle: () => void, toggleFollowAction: ToggleFollowAction }) {
  const { isFollowing, toggleFollow, isLoading, isProcessing } = useFollow(userToList.uid, toggleFollowAction, onFollowToggle);
  const isSelf = currentUser.uid === userToList.uid;

  return (
    <div className="flex items-center justify-between p-4">
      <Link href={`/profile/${userToList.username}`} className="flex items-center gap-4 group">
        <Avatar>
          <AvatarImage src={userToList.avatarUrl} alt={userToList.username} />
          <AvatarFallback>{userToList.username?.charAt(0)}</AvatarFallback>
        </Avatar>
        <p className="font-semibold group-hover:text-primary transition-colors">{userToList.username}</p>
      </Link>
      {!isSelf && (
        <Button
          variant={isFollowing ? "outline" : "default"}
          size="sm"
          onClick={(e) => {
              e.preventDefault(); // Prevent link navigation
              toggleFollow();
            }}
          disabled={isLoading || isProcessing}
        >
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );
}


export function ConnectionsPageClient({ toggleFollowAction }: { toggleFollowAction: ToggleFollowAction }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [following, setFollowing] = useState<User[]>([]);
    const [followers, setFollowers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConnections = useCallback(async () => {
        if (!user || !db) return; // Guard against uninitialized db
        setLoading(true);
        try {
            // Fetch following
            const followingQuery = query(collection(db, `users/${user.uid}/following`));
            const followingSnapshot = await getDocs(followingQuery);
            const followingIds = followingSnapshot.docs.map(d => d.id);
            if (followingIds.length > 0) {
                const followingPromises = followingIds.map(id => getDoc(doc(db, 'users', id)));
                const followingDocs = await Promise.all(followingPromises);
                setFollowing(followingDocs.map(d => ({ ...d.data(), uid: d.id }) as User));
            } else {
                 setFollowing([]);
            }

            // Fetch followers
            const followersQuery = query(collection(db, `users/${user.uid}/followers`));
            const followersSnapshot = await getDocs(followersQuery);
            const followersIds = followersSnapshot.docs.map(d => d.id);
             if (followersIds.length > 0) {
                const followersPromises = followersIds.map(id => getDoc(doc(db, 'users', id)));
                const followersDocs = await Promise.all(followersPromises);
                setFollowers(followersDocs.map(d => ({ ...d.data(), uid: d.id }) as User));
             } else {
                setFollowers([]);
             }

        } catch (error) {
            console.error("Error fetching connections:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);


    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

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
                <Link href="/my-collectoroom/settings">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Settings
                </Link>
                </Button>
            </div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">Connections</h1>
            </div>
            
            <Tabs defaultValue="following">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
                    <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="following">
                    <Card>
                        <CardContent className="p-0">
                           {following.length > 0 ? (
                                <div className="divide-y">
                                    {following.map(f => <UserRow key={f.uid} userToList={f} currentUser={user} onFollowToggle={fetchConnections} toggleFollowAction={toggleFollowAction} />)}
                                </div>
                           ): (
                            <p className="p-8 text-center text-muted-foreground">You are not following anyone yet.</p>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="followers">
                    <Card>
                        <CardContent className="p-0">
                             {followers.length > 0 ? (
                                <div className="divide-y">
                                    {followers.map(f => <UserRow key={f.uid} userToList={f} currentUser={user} onFollowToggle={fetchConnections} toggleFollowAction={toggleFollowAction} />)}
                                </div>
                             ) : (
                                <p className="p-8 text-center text-muted-foreground">You have no followers yet.</p>
                             )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
