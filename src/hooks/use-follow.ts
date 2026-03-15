
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from './use-toast';

// The hook now accepts the server action as an argument.
export function useFollow(
    targetUserId: string, 
    toggleFollowAction: (params: { targetUserId: string, currentUserId: string }) => Promise<any>,
    onSuccess?: () => void
) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkInitialFollowStatus = async () => {
            if (authLoading || !user || !targetUserId || user.uid === targetUserId) {
                setIsFollowing(false);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/follow?targetUserId=${encodeURIComponent(targetUserId)}`);
                if (!res.ok) {
                    setIsFollowing(false);
                } else {
                    const data = await res.json();
                    setIsFollowing(Boolean(data.isFollowing));
                }
            } catch (error) {
                console.error('Error checking follow status:', error);
                setIsFollowing(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkInitialFollowStatus();
    }, [user, targetUserId, authLoading]);
    
    const performToggleFollow = useCallback(async () => {
        if (!user || !targetUserId || user.uid === targetUserId || isProcessing || authLoading) {
            if (!user && !authLoading) {
                toast({ title: 'Please log in', description: 'You need to be logged in to follow users.', variant: 'destructive' });
            }
            return;
        }

        setIsProcessing(true);
        const originalFollowState = isFollowing;

        // Optimistically update the UI
        setIsFollowing(!originalFollowState);

        try {
            if (toggleFollowAction) {
                const result = await toggleFollowAction({ targetUserId, currentUserId: user.uid });
                const confirmedState = result.newState === 'followed';
                if (isFollowing !== confirmedState) setIsFollowing(confirmedState);
            } else {
                const res = await fetch('/api/follow', { method: 'POST', body: JSON.stringify({ targetUserId }), headers: { 'Content-Type': 'application/json' } });
                const data = await res.json();
                if (res.ok && data.success) setIsFollowing(Boolean(data.isFollowing));
                else throw new Error(data.message || 'Failed to toggle follow');
            }

            toast({
                title: isFollowing ? 'Unfollowed' : 'Followed!',
                description: `You are ${isFollowing ? 'no longer following' : 'now following'} this user.`,
            });
            onSuccess?.();

        } catch (error: any) {
            console.error('Error toggling follow:', error);
            setIsFollowing(originalFollowState);
            toast({ title: 'Error', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, authLoading, targetUserId, isFollowing, isProcessing, toast, onSuccess, toggleFollowAction]);

    return { isFollowing, toggleFollow: performToggleFollow, isLoading, isProcessing };
}
