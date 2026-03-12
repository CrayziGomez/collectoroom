"use server";

import { NextResponse } from 'next/server';

const CLERK_API_BASE = process.env.CLERK_BACKEND_API_URL || 'https://api.clerk.com';
const CLERK_SECRET = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;

async function lookupUserByEmail(email: string) {
  const url = `${CLERK_API_BASE}/v1/users?email_address=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${CLERK_SECRET}` } });
  if (!res.ok) throw new Error(`Clerk lookup failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function createRecoveryTokenForUser(userId: string) {
  const url = `${CLERK_API_BASE}/v1/recovery_tokens`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  return res;
}

async function fallbackSendReset(userId: string) {
  // Some Clerk accounts support an action endpoint to send a reset email.
  const url = `${CLERK_API_BASE}/v1/users/${userId}/actions/send_reset_password_email`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${CLERK_SECRET}` } });
  return res;
}

export async function POST(req: Request) {
  try {
    if (!CLERK_SECRET) {
      console.error('Clerk secret key not configured (CLERK_SECRET_KEY)');
      return NextResponse.json({ success: false, message: 'Server not configured for password resets.' }, { status: 500 });
    }

    const body = await req.json();
    const email = body?.email?.toString().trim();
    if (!email) return NextResponse.json({ success: false, message: 'Missing email' }, { status: 400 });

    // Lookup user by email (Clerk returns an array)
    const user = await lookupUserByEmail(email);

    // Always return success to avoid email enumeration, but attempt to trigger Clerk flow when user exists.
    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
    }

    // Try creating a recovery token (recommended Clerk admin flow).
    let res = await createRecoveryTokenForUser(user.id);
    if (res.ok) {
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
    }

    // Fallback: try alternative action endpoint
    try {
      const fb = await fallbackSendReset(user.id);
      if (fb.ok) return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
      console.error('Clerk fallback send reset failed:', fb.status, await fb.text());
    } catch (e) {
      console.error('Clerk fallback error:', e);
    }

    // If Clerk calls failed, log and return a non-revealing success to the client.
    console.error('Clerk recovery token creation failed:', res.status, await res.text());
    return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
  } catch (err: any) {
    console.error('Forgot password API error:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
