
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import type { Chat, Message, User } from '@/lib/types';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ChatPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const chatId = Array.isArray(params.chatId) ? params.chatId[0] : params.chatId;
    
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherParticipant, setOtherParticipant] = useState<Pick<User, 'username' | 'avatarUrl'> | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

     useEffect(() => {
        if (authLoading || !user) return;
        if (!chatId || !chat) return;

        // Reset unread count for the current user when they enter the chat.
        const chatRef = doc(db, 'chats', chatId);
        const unreadPath = `unreadCount.${user.uid}`;

        // We check if the field exists before updating
        if (chat.unreadCount && chat.unreadCount[user.uid] > 0) {
            updateDoc(chatRef, { [unreadPath]: 0 });
        }

    }, [chatId, user, authLoading, chat]);


    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading) router.push('/login');
            return;
        }
        if (!chatId) return;

        setLoading(true);

        const chatRef = doc(db, 'chats', chatId);
        const unsubscribeChat = onSnapshot(chatRef, async (docSnap) => {
            if (docSnap.exists()) {
                const chatData = { id: docSnap.id, ...docSnap.data() } as Chat;
                
                if (!chatData.participantIds.includes(user.uid)) {
                    router.push('/messages');
                    return;
                }
                
                setChat(chatData);
                const otherId = chatData.participantIds.find(id => id !== user.uid);
                if (otherId && chatData.participants) {
                    setOtherParticipant(chatData.participants[otherId]);
                }

            } else {
                // It might just be creating, so we don't redirect immediately.
                // We let the messages query handle the final loading state.
                console.log("Chat document not found, waiting...");
            }
        });

        const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
            const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Message);
            setMessages(messagesData);
            setLoading(false); // Set loading to false once we have messages (or an empty list)
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });

        return () => {
            unsubscribeChat();
            unsubscribeMessages();
        };

    }, [chatId, user, authLoading, router]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !chat) return;

        const otherId = chat.participantIds.find(id => id !== user.uid);
        if (!otherId) return;

        setIsSending(true);
        try {
            const messagesColRef = collection(db, 'chats', chat.id, 'messages');
            await addDoc(messagesColRef, {
                chatId: chat.id,
                senderId: user.uid,
                text: newMessage,
                timestamp: serverTimestamp(),
            });

            const chatDocRef = doc(db, 'chats', chat.id);
            // Update last message and increment unread count for the other user
            await updateDoc(chatDocRef, {
                lastMessage: {
                    text: newMessage,
                    timestamp: serverTimestamp(),
                },
                [`unreadCount.${otherId}`]: increment(1),
            });


            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    if (loading || authLoading) {
        return (
            <div className="h-[calc(100vh-8rem)] container py-8 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!chat || !otherParticipant) {
        // This state can happen briefly while chat is being created.
        // The loader above should catch most cases, but this is a fallback.
        return (
             <div className="h-[calc(100vh-8rem)] container py-8 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container py-4 h-[calc(100vh-8rem)] flex flex-col max-w-3xl mx-auto">
             <header className="border-b pb-4 mb-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/messages"><ArrowLeft /></Link>
                </Button>
                <Avatar>
                    <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.username} />
                    <AvatarFallback>{otherParticipant.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold">{otherParticipant.username}</h1>
            </header>
            <main className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4">
                {messages.map((message) => {
                    const isSender = message.senderId === user?.uid;
                    return (
                        <div key={message.id} className={cn('flex items-end gap-2', isSender ? 'justify-end' : 'justify-start')}>
                            {!isSender && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={otherParticipant.avatarUrl} />
                                    <AvatarFallback>{otherParticipant.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'max-w-xs md:max-w-md p-3 rounded-lg',
                                isSender ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                            )}>
                                <p className="text-sm">{message.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>
            <footer className="pt-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </footer>
        </div>
    );
}
