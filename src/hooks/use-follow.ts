
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import { useToast } from './use-toast';

export function useFollow(targetUserId: string) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // To disable button during async operation
    const [isLoading, setIsLoading] = useState(true); // To check initial follow status

    useEffect(() => {
        const checkInitialFollowStatus = async () => {
            if (authLoading || !user || !targetUserId) {
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
    
    const toggleFollow = useCallback(async () => {
        if (!user || !targetUserId || user.uid === targetUserId || isProcessing) return;

        setIsProcessing(true);

        const optimisticNewFollowState = !isFollowing;
        setIsFollowing(optimisticNewFollowState); // Optimistic UI update

        const currentUserRef = doc(db, 'users', user.uid);
        const targetUserRef = doc(db, 'users', targetUserId);
        const followingRef = doc(currentUserRef, 'following', targetUserId);
        const followerRef = doc(targetUserRef, 'followers', user.uid);

        try {
            const batch = writeBatch(db);

            if (optimisticNewFollowState) {
                // Follow logic
                batch.set(followingRef, { timestamp: new Date() });
                batch.set(followerRef, { timestamp: new Date() });
                batch.update(currentUserRef, { followingCount: increment(1) });
                batch.update(targetUserRef, { followerCount: increment(1) });
                
                await batch.commit();
                toast({ title: "Followed!", description: `You are now following this user.` });

            } else {
                // Unfollow logic
                batch.delete(followingRef);
                batch.delete(followerRef);
                batch.update(currentUserRef, { followingCount: increment(-1) });
                batch.update(targetUserRef, { followerCount: increment(-1) });
                
                await batch.commit();
                toast({ title: "Unfollowed", description: `You are no longer following this user.` });
            }
        } catch (error: any) {
            console.error("Error toggling follow:", error);
            // Revert optimistic update on error
            setIsFollowing(!optimisticNewFollowState);
            toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, targetUserId, isFollowing, isProcessing, toast]);

    return { isFollowing, toggleFollow, isLoading, isProcessing };
}
