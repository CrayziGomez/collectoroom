
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { useToast } from './use-toast';

export function useFollow(targetUserId: string) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user || !targetUserId) {
            setIsLoading(false);
            setIsFollowing(false);
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
            setIsFollowing(false);
        });
        
        return () => unsubscribe();
        
    }, [user, targetUserId, authLoading]);
    
    const toggleFollow = useCallback(async () => {
        if (!user || !targetUserId || user.uid === targetUserId || isProcessing) return;

        setIsProcessing(true);
        
        const currentUserRef = doc(db, 'users', user.uid);
        const targetUserRef = doc(db, 'users', targetUserId);
        const followingRef = doc(currentUserRef, 'following', targetUserId);
        const followerRef = doc(targetUserRef, 'followers', user.uid);

        try {
            const batch = writeBatch(db);
            const currentUserDoc = await getDoc(currentUserRef);
            const targetUserDoc = await getDoc(targetUserRef);
            
            const currentUserData = currentUserDoc.data() || {};
            const targetUserData = targetUserDoc.data() || {};
            const isCurrentlyFollowing = (await getDoc(followingRef)).exists();

            if (isCurrentlyFollowing) {
                // Unfollow logic
                batch.delete(followingRef);
                batch.delete(followerRef);
                batch.update(currentUserRef, { followingCount: Math.max(0, (currentUserData.followingCount || 0) - 1) });
                batch.update(targetUserRef, { followerCount: Math.max(0, (targetUserData.followerCount || 0) - 1) });
                
                await batch.commit();
                toast({ title: "Unfollowed", description: `You are no longer following this user.` });

            } else {
                // Follow logic
                batch.set(followingRef, { timestamp: new Date() });
                batch.set(followerRef, { timestamp: new Date() });
                batch.update(currentUserRef, { followingCount: (currentUserData.followingCount || 0) + 1 });
                batch.update(targetUserRef, { followerCount: (targetUserData.followerCount || 0) + 1 });

                await batch.commit();
                toast({ title: "Followed!", description: `You are now following this user.` });
            }
        } catch (error: any) {
            console.error("Error toggling follow:", error);
            toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }, [user, targetUserId, isProcessing, toast]);

    return { isFollowing, toggleFollow, isLoading, isProcessing };
}
