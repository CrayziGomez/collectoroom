
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export default function TestDbPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleWriteTest = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to perform this test.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // This attempts to write a document to a 'tests' collection.
      // The document ID will be the current user's ID.
      const testDocRef = doc(db, 'tests', user.uid);
      await setDoc(testDocRef, {
        message: 'Hello, Firestore!',
        timestamp: Timestamp.now(),
        userId: user.uid,
      });

      toast({
        title: 'Success!',
        description: 'Successfully wrote a document to the "tests" collection in Firestore.',
      });
    } catch (error: any) {
      console.error('Firestore write failed:', error);
      toast({
        title: 'Firestore Write Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Firestore Database Test</CardTitle>
            <CardDescription>
              This page is for testing the connection to your Firestore database. Click the button below to attempt to write a document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Current User Status: {user ? `Logged in as ${user.email}` : 'Not logged in'}
            </p>
            <Button onClick={handleWriteTest} disabled={!user} className="w-full">
              Write to Firestore
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              This will only work if you are logged in and your Firestore security rules allow logged-in users to write to the 'tests' collection. You may need to add the rule: `match /tests/{testId} { allow write: if request.auth != null; }`
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
