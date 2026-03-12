
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from './use-toast';

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
        try {
            const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({ otherUserId }), headers: { 'Content-Type': 'application/json' } });
            if (!res.ok) throw new Error('Failed to create chat');
            const data = await res.json();
            return data.chatId || null;
        } catch (error: any) {
            console.error('Error creating or finding chat:', error);
            toast({ title: 'Error', description: error.message || 'Could not start the chat. Please try again.', variant: 'destructive' });
            return null;
        } finally {
            setIsCreatingChat(false);
        }
    };

    return { isCreatingChat, createOrFindChat };
}
