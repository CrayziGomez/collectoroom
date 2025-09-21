
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { toggleFollow as toggleFollowFlow } from '@/ai/flows/user-actions';

export function useFollow(targetUserId: string) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Effect to check the initial follow status
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
    
    // The actual follow/unfollow action
    const toggleFollow = useCallback(async () => {
        if (!user || !user.firebaseUser || !targetUserId || user.uid === targetUserId || isProcessing || authLoading) {
            if (!user && !authLoading) {
                toast({ title: 'Please log in', description: 'You need to be logged in to follow users.', variant: 'destructive' });
            }
            return;
        }

        setIsProcessing(true);
        const originalFollowState = isFollowing;

        // Optimistic UI update
        setIsFollowing(!originalFollowState);

        try {
            const idToken = await user.firebaseUser.getIdToken();
            const result = await toggleFollowFlow({ idToken, targetUserId });

            // The backend confirms the new state. If it's different, we correct the UI.
            const confirmedState = result.newState === 'followed';
            if (isFollowing !== confirmedState) {
                setIsFollowing(confirmedState);
            }
            
            toast({
                title: confirmedState ? "Followed!" : "Unfollowed",
                description: `You are ${confirmedState ? 'now following' : 'no longer following'} this user.`,
            });

        } catch (error: any) {
            console.error("Error toggling follow:", error);
            // Revert optimistic update on error
            setIsFollowing(originalFollowState); 
            toast({ title: 'Error', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, authLoading, targetUserId, isFollowing, isProcessing, toast]);

    return { isFollowing, toggleFollow, isLoading, isProcessing };
}
