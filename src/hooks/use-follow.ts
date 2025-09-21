
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, DocumentReference } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { User } from '@/lib/types';

export function useFollow(targetUserId: string) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // This function runs once to check the initial follow status.
        const checkInitialFollowStatus = async () => {
            // We only run this check if auth is resolved, we have a user, and a target user.
            if (authLoading || !user || !targetUserId) {
                setIsLoading(false);
                setIsFollowing(false);
                return;
            }

            // Don't check if the user is looking at their own profile.
            if (user.uid === targetUserId) {
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
        if (!user || !targetUserId || user.uid === targetUserId || isProcessing || authLoading) {
            if (!user && !authLoading) {
                toast({ title: 'Please log in', description: 'You need to be logged in to follow users.', variant: 'destructive' });
            }
            return;
        }

        setIsProcessing(true);
        const newFollowState = !isFollowing;

        // Optimistic UI update
        setIsFollowing(newFollowState);

        try {
            await runTransaction(db, async (transaction) => {
                const currentUserRef = doc(db, 'users', user.uid);
                const targetUserRef = doc(db, 'users', targetUserId);
                const followingRef = doc(currentUserRef, 'following', targetUserId);
                const followerRef = doc(targetUserRef, 'followers', user.uid);
                
                if (newFollowState) {
                    // Follow logic
                    transaction.set(followingRef, { timestamp: new Date() });
                    transaction.set(followerRef, { timestamp: new Date() });
                    
                    const currentUserDoc = await transaction.get(currentUserRef);
                    const targetUserDoc = await transaction.get(targetUserRef);

                    const newFollowingCount = (currentUserDoc.data()?.followingCount || 0) + 1;
                    const newFollowerCount = (targetUserDoc.data()?.followerCount || 0) + 1;
                    
                    transaction.update(currentUserRef, { followingCount: newFollowingCount });
                    transaction.update(targetUserRef, { followerCount: newFollowerCount });

                } else {
                    // Unfollow logic
                    transaction.delete(followingRef);
                    transaction.delete(followerRef);

                    const currentUserDoc = await transaction.get(currentUserRef);
                    const targetUserDoc = await transaction.get(targetUserRef);

                    const newFollowingCount = Math.max(0, (currentUserDoc.data()?.followingCount || 0) - 1);
                    const newFollowerCount = Math.max(0, (targetUserDoc.data()?.followerCount || 0) - 1);

                    transaction.update(currentUserRef, { followingCount: newFollowingCount });
                    transaction.update(targetUserRef, { followerCount: newFollowerCount });
                }
            });

            toast({
                title: newFollowState ? "Followed!" : "Unfollowed",
                description: `You are ${newFollowState ? 'now following' : 'no longer following'} this user.`,
            });

        } catch (error) {
            console.error("Error toggling follow:", error);
            // Revert optimistic update on error
            setIsFollowing(!newFollowState); 
            toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, authLoading, targetUserId, isFollowing, isProcessing, toast]);

    return { isFollowing, toggleFollow, isLoading, isProcessing };
}
