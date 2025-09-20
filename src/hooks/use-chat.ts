
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from './use-toast';
import { User } from '@/lib/types';

export function useChat() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    const createOrFindChat = async (otherUserId: string): Promise<string | null> => {
        if (!user) {
            toast({ title: 'Authentication required', description: 'You must be logged in to start a chat.', variant: 'destructive' });
            return null;
        }

        if (user.uid === otherUserId) {
            toast({ title: 'Cannot message yourself', description: 'You cannot start a chat with yourself.', variant: 'destructive' });
            return null;
        }

        setIsCreatingChat(true);

        // A consistent ID for the chat between two users
        const chatId = [user.uid, otherUserId].sort().join('_');
        const chatRef = doc(db, 'chats', chatId);

        try {
            const chatSnap = await getDoc(chatRef);

            if (chatSnap.exists()) {
                // Chat already exists, just return the ID
                return chatId;
            }

            // Chat doesn't exist, create it
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));

            if (!otherUserDoc.exists()) {
                throw new Error("The user you're trying to chat with doesn't exist.");
            }

            const otherUserData = otherUserDoc.data() as User;
            
            await setDoc(chatRef, {
                participantIds: [user.uid, otherUserId],
                participants: {
                    [user.uid]: {
                        username: user.username,
                        avatarUrl: user.avatarUrl || ''
                    },
                    [otherUserId]: {
                        username: otherUserData.username,
                        avatarUrl: otherUserData.avatarUrl || ''
                    }
                },
                lastMessage: {
                    text: 'Chat started',
                    timestamp: serverTimestamp()
                }
            });

            return chatId;
            
        } catch (error: any) {
            console.error("Error creating or finding chat:", error);
            toast({
                title: 'Error',
                description: error.message || 'Could not start the chat. Please try again.',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsCreatingChat(false);
        }
    };

    return { isCreatingChat, createOrFindChat };
}
