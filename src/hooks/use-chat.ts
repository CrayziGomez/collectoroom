
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

        const chatId = [user.uid, otherUserId].sort().join('_');
        const chatRef = doc(db, 'chats', chatId);

        try {
            // "Create or merge" approach to avoid a separate 'get' call.
            // First, get the other user's data to ensure they exist and we have their info.
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));

            if (!otherUserDoc.exists()) {
                throw new Error("The user you're trying to chat with doesn't exist.");
            }

            const otherUserData = otherUserDoc.data() as User;
            
            // Atomically create the chat document if it doesn't exist, or merge the fields 
            // if it does. This avoids a separate read operation that fails security rules.
            // The `setDoc` with `merge: true` will not overwrite existing fields if the doc exists.
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
                // Only set lastMessage on creation, don't overwrite it on subsequent calls.
                lastMessage: {
                    text: 'Chat started',
                    timestamp: serverTimestamp()
                }
            }, { merge: true }); // Using merge is key to not overwriting existing chats.

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
