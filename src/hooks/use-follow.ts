
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { toggleFollow as toggleFollowAction } from '@/app/actions/user-actions';

export function useFollow(targetUserId: string, onSuccess?: () => void) {
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
                const followingRef = doc(db, 'users', user.uid, 'following', targetUserId);
                const docSnap = await getDoc(followingRef);
                setIsFollowing(docSnap.exists());
            } catch (error) {
                console.error("Error checking follow status:", error);
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
            const result = await toggleFollowAction({ targetUserId, currentUserId: user.uid });

            // Confirm the final state from the server
            const confirmedState = result.newState === 'followed';
            if (isFollowing !== confirmedState) {
                setIsFollowing(confirmedState);
            }
            
            toast({
                title: confirmedState ? "Followed!" : "Unfollowed",
                description: `You are ${confirmedState ? 'now following' : 'no longer following'} this user.`,
            });
            
            // Callback to refresh data on the parent component if needed
            onSuccess?.();

        } catch (error: any) {
            console.error("Error toggling follow:", error);
            // Revert UI on error
            setIsFollowing(originalFollowState); 
            toast({ title: 'Error', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, authLoading, targetUserId, isFollowing, isProcessing, toast, onSuccess]);

    return { isFollowing, toggleFollow: performToggleFollow, isLoading, isProcessing };
}
