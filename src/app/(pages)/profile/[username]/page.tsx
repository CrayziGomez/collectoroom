
'use client';

import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, UserPlus, UserCheck, Layers, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Collection, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/use-chat';
import { useFollow } from '@/hooks/use-follow';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { createOrFindChat, isCreatingChat } = useChat();

  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Note: useFollow hook needs a user ID, which we only get after fetching the profileUser
  const { isFollowing, toggleFollow, isLoading: isFollowLoading, isProcessing: isFollowProcessing } = useFollow(profileUser?.uid || '');

  const fetchProfileData = useCallback(async () => {
    if (!username) return;
    setLoading(true);

    try {
        // Find user by username
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where("username", "==", username), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            notFound();
            return;
        }

        const userDoc = userSnapshot.docs[0];
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        setProfileUser(userData);

        // Fetch user's public collections
        const collectionsQuery = query(
            collection(db, 'collections'), 
            where('userId', '==', userDoc.id),
            where('isPublic', '==', true)
        );
        const collectionsSnapshot = await getDocs(collectionsQuery);
        const collectionsData = collectionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Collection);
        setCollections(collectionsData);

    } catch (error) {
        console.error("Error fetching profile data:", error);
        toast({ title: "Error", description: "Could not load profile.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [username, toast]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleStartChat = async () => {
    if (authLoading || !currentUser || !profileUser || currentUser.uid === profileUser.uid) return;
    
    const chatId = await createOrFindChat(profileUser.uid);
    if (chatId) {
      router.push(`/messages/${chatId}`);
    }
  };
  
  if (loading || authLoading) {
      return (
          <div className="container py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }
  
  if (!profileUser) {
    // This will be caught by notFound() in fetch but as a fallback
    return notFound();
  }

  const isOwnProfile = currentUser?.uid === profileUser.uid;
  const FollowButtonIcon = isFollowing ? UserCheck : UserPlus;

  return (
    <div className="container py-8">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={profileUser.avatarUrl || ''} alt={profileUser.username} />
              <AvatarFallback className="text-4xl">{profileUser.username?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-4xl font-bold font-headline">{profileUser.username}</h1>
                <div className="flex items-center justify-center gap-4 mt-2 text-muted-foreground">
                    <span>
                        <span className="font-bold text-foreground">{profileUser.followerCount || 0}</span> Followers
                    </span>
                    <span>
                        <span className="font-bold text-foreground">{profileUser.followingCount || 0}</span> Following
                    </span>
                </div>
            </div>
            {!isOwnProfile && currentUser && (
                <div className="flex items-center gap-2">
                 <Button variant="outline" onClick={toggleFollow} disabled={isFollowLoading || isFollowProcessing}>
                    {isFollowProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FollowButtonIcon className="mr-2 h-4 w-4" />}
                    {isFollowing ? 'Following' : 'Follow'}
                 </Button>
                 <Button variant="outline" onClick={handleStartChat} disabled={isCreatingChat || authLoading}>
                    {isCreatingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    Message
                </Button>
                </div>
            )}
        </div>
      </div>

      {/* Collections Grid */}
       <div className="border-t pt-8">
         <h2 className="text-2xl font-bold font-headline mb-6 text-center">Public Collections</h2>
         {collections.length === 0 && !loading ? (
           <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4">This user has no public collections yet.</p>
           </div>
         ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map(collection => (
              <Card key={collection.id} className="overflow-hidden group">
                <Link href={`/collections/${collection.id}`}>
                    <div className="relative">
                      <Image
                        src={collection.coverImage}
                        alt={`Cover image for ${collection.name}`}
                        width={400}
                        height={300}
                        className="aspect-[4/3] object-cover w-full group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint={collection.coverImageHint}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                       <Badge variant="secondary" className="absolute top-2 right-2">{collection.category}</Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary">{collection.name}</h3>
                       <p className="text-sm text-muted-foreground line-clamp-2 h-[40px] mt-1">{collection.description}</p>
                    </div>
                </Link>
              </Card>
            ))}
          </div>
         )}
       </div>
    </div>
  );
}
