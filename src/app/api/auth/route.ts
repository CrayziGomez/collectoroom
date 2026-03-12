
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Firebase session creation endpoint replaced by Clerk-managed sessions.
// Keep a compatible endpoint for clients that expect it; POST is a noop here.
export async function POST(request: Request) {
  try {
    // Clerk handles sessions separately; nothing to do here.
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Session creation noop failed:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
