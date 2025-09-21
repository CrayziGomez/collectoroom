
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { useToast } from './use-toast';

export function useFollow(targetUserId: string) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !targetUserId) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        const followingRef = doc(db, 'users', user.uid, 'following', targetUserId);
        const unsubscribe = onSnapshot(followingRef, (docSnap) => {
            setIsFollowing(docSnap.exists());
            setIsLoading(false);
        }, (error) => {
            console.error("Error checking follow status:", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [user, targetUserId]);
    
    const toggleFollow = async () => {
        if (!user || !targetUserId || user.uid === targetUserId) return;

        setIsProcessing(true);
        const currentUserRef = doc(db, 'users', user.uid);
        const targetUserRef = doc(db, 'users', targetUserId);
        const followingRef = doc(currentUserRef, 'following', targetUserId);
        const followerRef = doc(targetUserRef, 'followers', user.uid);

        try {
            const batch = writeBatch(db);
            
            if (isFollowing) {
                // Unfollow logic
                batch.delete(followingRef);
                batch.delete(followerRef);
                batch.update(currentUserRef, { followingCount: increment(-1) });
                batch.update(targetUserRef, { followerCount: increment(-1) });
                toast({ title: "Unfollowed", description: `You are no longer following this user.` });
            } else {
                // Follow logic
                batch.set(followingRef, { timestamp: new Date() });
                batch.set(followerRef, { timestamp: new Date() });
                batch.update(currentUserRef, { followingCount: increment(1) });
                batch.update(targetUserRef, { followerCount: increment(1) });
                toast({ title: "Followed!", description: `You are now following this user.` });
            }
            
            await batch.commit();
            setIsFollowing(!isFollowing);

        } catch (error: any) {
            console.error("Error toggling follow:", error);
            toast({
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return { isFollowing, toggleFollow, isLoading, isProcessing };
}
