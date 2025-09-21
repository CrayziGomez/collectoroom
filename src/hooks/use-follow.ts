
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { useToast } from './use-toast';

export function useFollow(targetUserId: string) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkInitialFollowStatus = async () => {
            if (authLoading || !user || !targetUserId) {
                setIsLoading(false);
                setIsFollowing(false); // Ensure it's false if no user
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
        const newFollowState = !isFollowing;
        setIsFollowing(newFollowState); // Optimistic UI update

        try {
            await runTransaction(db, async (transaction) => {
                const currentUserRef = doc(db, 'users', user.uid);
                const targetUserRef = doc(db, 'users', targetUserId);
                const followingRef = doc(currentUserRef, 'following', targetUserId);
                const followerRef = doc(targetUserRef, 'followers', user.uid);

                const currentUserDoc = await transaction.get(currentUserRef);
                const targetUserDoc = await transaction.get(targetUserRef);

                if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
                    throw "User not found";
                }
                
                const currentUserData = currentUserDoc.data();
                const targetUserData = targetUserDoc.data();

                if (newFollowState) {
                    // Follow logic
                    transaction.set(followingRef, { timestamp: new Date() });
                    transaction.set(followerRef, { timestamp: new Date() });
                    
                    const newFollowingCount = (currentUserData.followingCount || 0) + 1;
                    const newFollowerCount = (targetUserData.followerCount || 0) + 1;
                    
                    transaction.update(currentUserRef, { followingCount: newFollowingCount });
                    transaction.update(targetUserRef, { followerCount: newFollowerCount });
                } else {
                    // Unfollow logic
                    transaction.delete(followingRef);
                    transaction.delete(followerRef);

                    const newFollowingCount = Math.max(0, (currentUserData.followingCount || 0) - 1);
                    const newFollowerCount = Math.max(0, (targetUserData.followerCount || 0) - 1);

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
            setIsFollowing(!newFollowState); // Revert optimistic update
            toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, targetUserId, isFollowing, isProcessing, toast]);

    return { isFollowing, toggleFollow, isLoading, isProcessing };
}
