
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, onSnapshot, DocumentSnapshot, increment } from 'firebase/firestore';
import { useToast } from './use-toast';

export function useFollow(targetUserId: string) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Set initial loading state based on auth status
        setIsLoading(authLoading);

        if (authLoading || !user || !targetUserId) {
            // If not authenticated or no target, ensure we are not in a following state.
            setIsFollowing(false);
            return;
        }
        
        // At this point, user is authenticated and we have a target.
        // Set up the real-time listener.
        const followingRef = doc(db, 'users', user.uid, 'following', targetUserId);
        const unsubscribe = onSnapshot(followingRef, (docSnap) => {
            setIsFollowing(docSnap.exists());
            setIsLoading(false); // We have our answer, so loading is done.
        }, (error) => {
            console.error("Error checking follow status:", error);
            setIsLoading(false); // Stop loading even if there's an error.
        });
        
        // This cleanup function is crucial. It runs when the component unmounts
        // OR when the dependencies (user, targetUserId) change. This prevents
        // dangling listeners when the user logs out.
        return () => unsubscribe();
        
    }, [user, targetUserId, authLoading]);
    
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

        } catch (error: any) {
            console.error("Error toggling follow:", error);
            // Attempt to read and write if increment fails
            if (error.code === 'not-found' || error.code === 'invalid-argument') {
                console.log('Increment failed, falling back to read-and-write method.');
                try {
                    const currentUserDoc = await getDoc(currentUserRef);
                    const targetUserDoc = await getDoc(targetUserRef);
                    const newBatch = writeBatch(db);

                    const currentUserData = currentUserDoc.data() || {};
                    const targetUserData = targetUserDoc.data() || {};

                    if (isFollowing) {
                         newBatch.update(currentUserRef, { followingCount: Math.max(0, (currentUserData.followingCount || 0) - 1) });
                         newBatch.update(targetUserRef, { followerCount: Math.max(0, (targetUserData.followerCount || 0) - 1) });
                    } else {
                         newBatch.update(currentUserRef, { followingCount: (currentUserData.followingCount || 0) + 1 });
                         newBatch.update(targetUserRef, { followerCount: (targetUserData.followerCount || 0) + 1 });
                    }
                    await newBatch.commit();
                } catch (fallbackError) {
                     console.error("Fallback follow toggle failed:", fallbackError);
                     toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
                }
            } else {
                toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return { isFollowing, toggleFollow, isLoading, isProcessing };
}
