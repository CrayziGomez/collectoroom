
import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export async function getCurrentUser(): Promise<DecodedIdToken | null> {
  const sessionCookie = cookies().get('__session')?.value || '';

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedIdToken;
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    return null;
  }
}
