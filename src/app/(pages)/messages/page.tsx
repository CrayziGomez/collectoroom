
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Chat } from '@/lib/types';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) {
            return; // Wait until auth state is resolved
        }
        if (!user) {
            router.push('/login');
            return;
        }

        setLoading(true);
        const chatsQuery = query(
            collection(db, 'chats'),
            where('participantIds', 'array-contains', user.uid),
            orderBy('lastMessage.timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(chatsQuery, (querySnapshot) => {
            const chatsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Chat);
            setChats(chatsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, router]);

    if (authLoading || loading) {
        return (
            <div className="container py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const getOtherParticipant = (chat: Chat) => {
        if (!user) return null;
        const otherId = chat.participantIds.find(id => id !== user.uid);
        return otherId ? chat.participants[otherId] : null;
    };


    return (
        <div className="container py-8 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">Messages</h1>
            </div>
            
            {chats.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <MessageSquarePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No conversations yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Start a conversation by messaging a collection owner.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {chats.map(chat => {
                        const otherParticipant = getOtherParticipant(chat);
                        if (!otherParticipant) return null;

                        const hasUnread = user && (chat.unreadCount?.[user.uid] ?? 0) > 0;
                        
                        return (
                            <Link href={`/messages/${chat.id}`} key={chat.id}>
                                <Card className="hover:bg-muted/50 transition-colors">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.username} />
                                            <AvatarFallback>{otherParticipant.username.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow overflow-hidden">
                                            <div className="flex justify-between">
                                                <p className={cn("font-semibold truncate", hasUnread && "font-bold")}>{otherParticipant.username}</p>
                                                {chat.lastMessage?.timestamp && (
                                                    <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                        {formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true })}
                                                    </p>
                                                )}
                                            </div>
                                            <p className={cn("text-sm text-muted-foreground truncate", hasUnread && "text-foreground font-medium")}>{chat.lastMessage?.text || 'No messages yet'}</p>
                                        </div>
                                         {hasUnread && (
                                            <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
