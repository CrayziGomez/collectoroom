
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
      const idToken = authorization.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(idToken);

      if (decodedToken) {
        const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        const options = { name: '__session', value: sessionCookie, maxAge: expiresIn, httpOnly: true, secure: true };

        cookies().set(options);
      }
    }
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Session creation failed:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Session deletion failed:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
