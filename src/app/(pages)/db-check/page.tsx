
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DbCheckPage() {
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<string>('');

  const handleReadTest = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to perform this test.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        setTestStatus('success');
        setTestResult(`Successfully read document for user: ${docSnap.data().username}`);
        toast({
          title: 'Success!',
          description: 'Successfully read your user document from Firestore.',
        });
      } else {
        setTestStatus('error');
        setTestResult(`Read attempt finished, but no document was found for your user ID (${user.uid}). This is the core problem.`);
        toast({
          title: 'Read Finished: Document Not Found',
          description: "This confirms the user document isn't being created in the database after signup.",
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Firestore read failed:', error);
      setTestStatus('error');
      setTestResult(`Firestore Read Failed: ${error.message}. Check Firestore security rules and Firebase project setup.`);
      toast({
        title: 'Firestore Read Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
      return (
          <div className="container py-12">
              <p>Loading user authentication...</p>
          </div>
      )
  }

  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Firestore Database Read Test</CardTitle>
            <CardDescription>
              This page tests if the application can read the logged-in user's profile from the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm p-4 bg-muted rounded-md">
                <p><strong>Status:</strong> {user ? `Logged in as ${user.email}` : 'Not logged in'}</p>
                {user && <p><strong>User ID:</strong> {user.uid}</p>}
            </div>
            
            <Button onClick={handleReadTest} disabled={!user} className="w-full">
              Attempt to Read User Document
            </Button>

            {testStatus !== 'idle' && (
                 <Alert variant={testStatus === 'success' ? 'default' : 'destructive'}>
                    <AlertTitle>{testStatus === 'success' ? 'Test Succeeded' : 'Test Result'}</AlertTitle>
                    <AlertDescription>
                        {testResult}
                    </AlertDescription>
                </Alert>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              This test requires you to be logged in. It will try to read the document at `/users/{'<your_user_id>'}`. Your security rules must allow this.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
