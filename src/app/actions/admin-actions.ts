
'use server';
import { adminDb } from '@/lib/firebase-admin';

export async function grantAdminRole(userId: string) {
  try {
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({ isAdmin: true });
    return { success: true, message: `User ${userId} has been granted admin privileges.` };
  } catch (error: any) {
    console.error('Error granting admin role:', error);
    return { success: false, message: error.message || 'An unknown error occurred while granting admin role.' };
  }
}
