import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRICING_TIERS } from '@/lib/constants';

export default function SignupPage() {
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
          <Input id="username" placeholder="Jane Doe" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required />
        </div>
         <div className="grid gap-2">
          <Label htmlFor="tier">Choose your plan</Label>
          <Select defaultValue="Hobbyist">
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
        <Button type="submit" className="w-full">
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
