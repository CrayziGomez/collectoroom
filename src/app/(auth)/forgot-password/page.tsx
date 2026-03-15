
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Failed to request password reset');
      }
      setIsSent(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to request password reset.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>
          {isSent 
            ? "Check your inbox for a password reset link."
            : "Enter your email and we'll send you a link to reset your password."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isSent ? (
          <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-md">
            <p>If an account exists for {email}, you will receive an email with instructions on how to reset your password. Please check your spam folder if you don't see it.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isSending} />
          </div>
        )}
        {!isSent && (
            <Button onClick={handlePasswordReset} className="w-full" disabled={isSending}>
             {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
        )}
      </CardContent>
      <div className="mt-4 text-center text-sm p-6 pt-0">
        Remember your password?{' '}
        <Link href="/login" className="underline">
          Login
        </Link>
      </div>
    </Card>
  );
}
