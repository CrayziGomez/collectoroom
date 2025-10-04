'use server';
import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';


// *****************************************************************************
// USER CRUD OPERATIONS
// *****************************************************************************

/**
 * Fetches a user document from Firestore by user ID.
 */
export async function getUser(userId: string) {
    try {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return { success: false, message: 'User not found.' };
        }

        return { success: true, user: userDoc.data() };
    } catch (error: any) {
        console.error('Error fetching user:', error);
        return { success: false, message: error.message || 'An unknown error occurred while fetching the user.' };
    }
}

/**
 * Creates a new user document in Firestore.
 * This is typically called when a new user signs up.
 */
export async function createUser(userId: string, email: string | null, name: string | null, avatarUrl: string | null) {
    try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.set({
            email,
            name,
            avatarUrl,
            createdAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error creating user:', error);
        return { success: false, message: error.message || 'An unknown error occurred while creating the user.' };
    }
}

/**
 * Updates a user's profile information.
 */
export async function updateUser(formData: FormData) {
    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const avatarFile = formData.get('avatar') as File;

    if (!userId) {
        return { success: false, message: 'User ID is required.' };
    }

    try {
        const userRef = adminDb.collection('users').doc(userId);
        const updateData: { [key: string]: any } = { name };

        if (avatarFile && avatarFile.size > 0) {
            const bucket = adminStorage.bucket();
            const imagePath = `users/${userId}/avatars/${avatarFile.name}`;
            const fileRef = bucket.file(imagePath);
            
            const fileBuffer = Buffer.from(await avatarFile.arrayBuffer());
            await fileRef.save(fileBuffer, { metadata: { contentType: avatarFile.type } });

            const [signedUrl] = await fileRef.getSignedUrl({ action: 'read', expires: '01-01-2100' });
            updateData.avatarUrl = signedUrl;
            updateData.avatarPath = imagePath;
        }

        await userRef.update(updateData);
        revalidatePath('/'); // Revalidate relevant paths

        return { success: true, message: 'Profile updated successfully.' };

    } catch (error: any) {
        console.error('Error updating user:', error);
        return { success: false, message: error.message || 'An unknown error occurred while updating the user.' };
    }
}


/**
 * Deletes a user from Firebase Authentication and Firestore.
 * Also deletes all associated data in Storage.
 */
export async function deleteUser(userId: string) {
    try {
        const userRef = adminDb.collection('users').doc(userId);

        // 1. Delete user's storage folder
        const bucket = adminStorage.bucket();
        const prefix = `users/${userId}/`;
        await bucket.deleteFiles({ prefix: prefix });

        // 2. Delete user's collections and cards (and their images)
        const collectionsSnapshot = await adminDb.collection('collections').where('userId', '==', userId).get();
        const batch = adminDb.batch();

        for (const doc of collectionsSnapshot.docs) {
            const cardsSnapshot = await doc.ref.collection('cards').get();
            for (const cardDoc of cardsSnapshot.docs) {
                // This part is redundant if the top-level folder is deleted, but good for safety
                const cardData = cardDoc.data();
                if (cardData.images && cardData.images.length > 0) {
                    for (const image of cardData.images) {
                        if (image.path) {
                           await bucket.file(image.path).delete({ ignoreNotFound: true });
                        }
                    }
                }
                batch.delete(cardDoc.ref);
            }
            batch.delete(doc.ref);
        }
        await batch.commit();

        // 3. Delete user document from Firestore
        await userRef.delete();

        // 4. Delete user from Firebase Authentication
        await adminAuth.deleteUser(userId);
        
        revalidatePath('/');

        return { success: true, message: 'User and all associated data deleted successfully.' };

    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { 
            success: false, 
            message: error.message || 'An unknown error occurred while deleting the user.',
            error: JSON.stringify(error, null, 2)
        };
    }
}

export async function toggleFollow({ currentUserId, targetUserId }: { currentUserId: string, targetUserId: string }) {
  const currentUserRef = adminDb.collection('users').doc(currentUserId);
  const targetUserRef = adminDb.collection('users').doc(targetUserId);

  const followingRef = currentUserRef.collection('following').doc(targetUserId);
  const followerRef = targetUserRef.collection('followers').doc(currentUserId);

  try {
    const isFollowing = (await followingRef.get()).exists;

    const batch = adminDb.batch();

    if (isFollowing) {
      batch.delete(followingRef);
      batch.delete(followerRef);
      batch.update(currentUserRef, { followingCount: FieldValue.increment(-1) });
      batch.update(targetUserRef, { followerCount: FieldValue.increment(-1) });
    } else {
      batch.set(followingRef, { followedAt: FieldValue.serverTimestamp() });
      batch.set(followerRef, { followerAt: FieldValue.serverTimestamp() });
      batch.update(currentUserRef, { followingCount: FieldValue.increment(1) });
      batch.update(targetUserRef, { followerCount: FieldValue.increment(1) });
    }

    await batch.commit();

    // Revalidate the pages where follow counts are displayed
    revalidatePath(`/profile/${targetUserId}`);
    revalidatePath('/my-collectoroom/connections');
    
    return { success: true, isFollowing: !isFollowing };

  } catch (error: any) {
    console.error("Error toggling follow:", error);
    return { success: false, message: error.message };
  }
}

export async function updateAvatar(formData: FormData) {
    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;

    if (!userId || !file) {
        return { success: false, message: 'User ID and file are required.' };
    }

    const bucket = adminStorage.bucket();
    const filePath = `avatars/${userId}/${Date.now()}_${file.name}`;
    const fileRef = bucket.file(filePath);

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await fileRef.save(fileBuffer, {
            metadata: { contentType: file.type },
        });

        const [url] = await fileRef.getSignedUrl({ action: 'read', expires: '03-09-2491' });

        await adminDb.collection('users').doc(userId).update({ avatarUrl: url });
        
        revalidatePath(`/profile/${userId}`);
        revalidatePath('/my-collectoroom/settings');

        return { success: true, avatarUrl: url, message: "Avatar updated successfully!" };
    } catch (error: any) {
        console.error("Error updating avatar:", error);
        return { success: false, message: error.message };
    }
}
