
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRICING_TIERS } from '@/lib/constants';
import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { app } from '@/lib/firebase';


export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState('Hobbyist');
  const auth = getAuth(app);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: username,
      });
      // In a real app, you would also save the selected tier to Firestore here.
      router.push('/my-collectoroom');
    } catch (error: any) {
       toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>
          Create your account to start building your digital collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="Jane Doe" required value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
         <div className="grid gap-2">
          <Label htmlFor="tier">Choose your plan</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger id="tier">
              <SelectValue placeholder="Select a tier" />
            </SelectTrigger>
            <SelectContent>
              {PRICING_TIERS.filter(t => !t.isComingSoon).map(tier => (
                 <SelectItem key={tier.name} value={tier.name}>{tier.name} ({tier.price}{tier.priceSuffix})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSignup} className="w-full">
          Create an account
        </Button>
      </CardContent>
       <div className="mt-4 text-center text-sm p-6 pt-0">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Login
        </Link>
      </div>
    </Card>
  );
}
