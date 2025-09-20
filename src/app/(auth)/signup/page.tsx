
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
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { app } from '@/lib/firebase';
import type { User } from '@/lib/types';


export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState('Hobbyist');
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async () => {
    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: username,
      });

      // 2. After successful creation, create the user document in Firestore
      // Check if this is the first user
      const usersCollection = await getDocs(collection(db, 'users'));
      const isFirstUser = usersCollection.empty;

      const newUser: User = {
        uid: user.uid,
        id: user.uid,
        username: username,
        email: user.email!,
        tier: tier as User['tier'],
        isAdmin: isFirstUser, // Make the first user an admin
        avatarUrl: user.photoURL || undefined,
      };

      await setDoc(doc(db, "users", user.uid), newUser);

      // 3. Redirect to the main app
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
