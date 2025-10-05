
'use server';

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { UserProfile } from "@/lib/types";

/**
 * Creates a new user profile in Firestore.
 * @param userId The UID of the user.
 * @param email The email of the user.
 * @param username The chosen username.
 * @returns A promise that resolves when the profile is created.
 */
export async function createUserProfile(userId: string, email: string, username: string) {
    try {
        const userRef = adminDb.collection('users').doc(userId);

        // Check for username uniqueness
        const usernameSnapshot = await adminDb.collection('users').where('username', '==', username).get();
        if (!usernameSnapshot.isEmpty) {
            throw new Error('Username is already taken.');
        }

        const newUserProfile: UserProfile = {
            uid: userId,
            email,
            username,
            displayName: username,
            photoURL: '', // Default or placeholder photo URL
            isAdmin: false, // Default isAdmin to false
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await userRef.set(newUserProfile);
        console.log(`User profile created for ${username}`);

        return { success: true, message: "User profile created successfully" };

    } catch (error) {
        console.error("Error creating user profile:", error);
        // It's better to throw the error or return a specific error message
        // to be handled by the calling function (e.g., in the signup page).
        return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred.' };
    }
}

/**
 * Deletes a user from Firebase Authentication and Firestore.
 * @param uid The user ID to delete.
 * @returns A promise that resolves when the user is deleted.
 */
export async function deleteUser(uid: string) {
    try {
        // Delete from Firebase Authentication
        await adminAuth.deleteUser(uid);

        // Delete from Firestore
        const userRef = adminDb.collection('users').doc(uid);
        await userRef.delete();

        return { success: true, message: 'User deleted successfully.' };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, message: 'Error deleting user.' };
    }
}
