
'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateUsername } from '@/app/actions/user-actions';
import { Loader2 } from 'lucide-react';
import { recountUsage } from '@/app/actions/user-actions-dev'; // Import the recount action

export function SettingsPageClient() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [newUsername, setNewUsername] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [recountMessage, setRecountMessage] = useState(''); // State for the recount message

    const handleUpdateUsername = async () => {
        if (!user || !newUsername) return;

        setIsUpdating(true);
        try {
            const result = await updateUsername(user.id, newUsername);
            if (result.success) {
                toast({ title: 'Success', description: 'Username updated successfully!' });
                await user.reload(); // Reload user data to get the new username
                router.push(`/profile/${newUsername}`);
            } else {
                throw new Error(result.message || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: `Failed to update username: ${error.message}`,
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };
    
    // Handler for the recount button
    const handleRecount = async () => {
        if (!user) {
            setRecountMessage('Please sign in to recount your usage.');
            return;
        }
        setRecountMessage('Recounting...');
        try {
            const result = await recountUsage(user.id);
            if (result.success) {
                setRecountMessage(`Recount successful! You now have ${result.collectionCount} collections and ${result.cardCount} cards.`);
            } else {
                setRecountMessage(`Error: ${result.message}`);
            }
        } catch (error: any) {
            setRecountMessage(`Error: ${error.message}`);
        }
    };


    if (!isLoaded) {
        return <div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="max-w-xl mx-auto grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>Update your public profile information.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input type="email" defaultValue={user?.primaryEmailAddress?.emailAddress} disabled />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="flex gap-2">
                            <Input
                                id="username"
                                defaultValue={user?.username || ''}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter a new username"
                            />
                            <Button onClick={handleUpdateUsername} disabled={isUpdating || !newUsername}>
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Plan & Usage</CardTitle>
                    <CardDescription>View your current plan and usage details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Placeholder for plan and usage details */}
                    <p>Your current plan details will be displayed here.</p>
                </CardContent>
            </Card>
            
            {/* --- Recount Usage Card --- */}
            <Card>
                <CardHeader>
                    <CardTitle>Fix Account Usage</CardTitle>
                    <CardDescription>
                        If your card or collection counts seem incorrect, you can force a recount. 
                        This will scan your account and update the totals to their correct values.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Button onClick={handleRecount}>Recount My Usage</Button>
                    {recountMessage && (
                        <p className="text-sm text-muted-foreground">{recountMessage}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
