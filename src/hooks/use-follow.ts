
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { useToast } from './use-toast';
import { getAdminInstances } from '@/lib/firebase-admin';

// This is a simplified, non-Genkit version of the server-side action.
// In a real app, this would be a proper Next.js Server Action file.
async function toggleFollow(input: { targetUserId: string, currentUserId: string }) {
    'use server';
    const { targetUserId, currentUserId } = input;
    const { adminDb } = getAdminInstances();

    if (currentUserId === targetUserId) {
      throw new Error('Users cannot follow themselves.');
    }

    try {
      const newState = await runTransaction(adminDb, async (transaction) => {
        const currentUserRef = doc(adminDb, 'users', currentUserId);
        const targetUserRef = doc(adminDb, 'users', targetUserId);
        const followingRef = doc(currentUserRef, 'following', targetUserId);

        const followingSnap = await transaction.get(followingRef);
        const isCurrentlyFollowing = followingSnap.exists();
        
        let finalState: 'followed' | 'unfollowed';

        if (isCurrentlyFollowing) {
          // --- Unfollow Logic ---
          const followerRef = doc(targetUserRef, 'followers', currentUserId);
          transaction.delete(followingRef);
          transaction.delete(followerRef);
          
          const currentUserDoc = await transaction.get(currentUserRef);
          const targetUserDoc = await transaction.get(targetUserRef);

          const newFollowingCount = Math.max(0, (currentUserDoc.data()?.followingCount || 0) - 1);
          const newFollowerCount = Math.max(0, (targetUserDoc.data()?.followerCount || 0) - 1);

          transaction.update(currentUserRef, { followingCount: newFollowingCount });
          transaction.update(targetUserRef, { followerCount: newFollowerCount });
          
          finalState = 'unfollowed';
        } else {
          // --- Follow Logic ---
          const followerRef = doc(targetUserRef, 'followers', currentUserId);
          transaction.set(followingRef, { timestamp: new Date() });
          transaction.set(followerRef, { timestamp: new Date() });

          const currentUserDoc = await transaction.get(currentUserRef);
          const targetUserDoc = await transaction.get(targetUserRef);
          
          const newFollowingCount = (currentUserDoc.data()?.followingCount || 0) + 1;
          const newFollowerCount = (targetUserDoc.data()?.followerCount || 0) + 1;

          transaction.update(currentUserRef, { followingCount: newFollowingCount });
          transaction.update(targetUserRef, { followerCount: newFollowerCount });

          finalState = 'followed';
        }
        
        return finalState;
      });

      return { newState };
    } catch (error: any) {
      console.error('Transaction failed:', error);
      throw new Error(`Failed to toggle follow state: ${error.message}`);
    }
}


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

        setIsFollowing(!originalFollowState);

        try {
            const result = await toggleFollow({ targetUserId, currentUserId: user.uid });

            const confirmedState = result.newState === 'followed';
            if (isFollowing !== confirmedState) {
                setIsFollowing(confirmedState);
            }
            
            toast({
                title: confirmedState ? "Followed!" : "Unfollowed",
                description: `You are ${confirmedState ? 'now following' : 'no longer following'} this user.`,
            });
            
            onSuccess?.();

        } catch (error: any) {
            console.error("Error toggling follow:", error);
            setIsFollowing(originalFollowState); 
            toast({ title: 'Error', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, authLoading, targetUserId, isFollowing, isProcessing, toast, onSuccess]);

    return { isFollowing, toggleFollow: performToggleFollow, isLoading, isProcessing };
}
