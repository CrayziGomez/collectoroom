
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [username, setUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
        } else {
            setUsername(user.username);
        }
    }, [user, authLoading, router]);

    const handleSaveChanges = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save changes.", variant: "destructive" });
            return;
        }

        if (username.length < 3) {
            toast({ title: "Validation Error", description: "Username must be at least 3 characters long.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                username: username,
            });
            toast({
                title: "Success!",
                description: "Your profile has been updated.",
            });
            router.push('/my-collectoroom');
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="container py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="container py-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-4">
                  <Button variant="ghost" asChild>
                    <Link href="/my-collectoroom">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to My CollectoRoom
                    </Link>
                  </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Settings</CardTitle>
                        <CardDescription>Update your username and view your profile details here.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={user.email} disabled />
                            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>
                         <div className="flex gap-4 text-sm">
                            <Link href="/my-collectoroom/connections" className="hover:underline">
                                <span className="font-bold text-foreground">{user.followerCount || 0}</span>
                                <span className="text-muted-foreground"> Followers</span>
                            </Link>
                             <Link href="/my-collectoroom/connections" className="hover:underline">
                                <span className="font-bold text-foreground">{user.followingCount || 0}</span>
                                <span className="text-muted-foreground"> Following</span>
                            </Link>
                        </div>
                        <div>
                             <Label>Current Plan</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant="outline">{user.tier} Plan</Badge>
                                <Button variant="secondary" size="sm" asChild>
                                  <Link href="/pricing">Change Plan</Link>
                                </Button>
                              </div>
                        </div>
                         <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
