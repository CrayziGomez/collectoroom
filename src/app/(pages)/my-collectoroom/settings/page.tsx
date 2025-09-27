
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2, ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Image from "next/image";
import { updateAvatar as updateAvatarAction } from "@/app/actions/user-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function SettingsPage() {
    const { user, loading: authLoading, updateUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [username, setUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Avatar Upload State
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            // Update client-side state
            updateUser({ username });
            toast({
                title: "Success!",
                description: "Your profile has been updated.",
            });
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
    
    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fiveMB = 5 * 1024 * 1024;
            if (file.size > fiveMB) {
                 toast({ title: "File too large", description: "Avatar image must be less than 5MB.", variant: "destructive" });
                 return;
            }
            setAvatarFile(file);
            const previewUrl = URL.createObjectURL(file);
            setAvatarPreview(previewUrl);
        }
    };

    const handleAvatarUpload = async () => {
        if (!user || !avatarFile) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('userId', user.uid);
            formData.append('file', avatarFile);

            const result = await updateAvatarAction(formData);

            if (result.success && result.avatarUrl) {
                toast({ title: "Avatar Updated!", description: "Your new profile picture has been saved." });
                updateUser({ avatarUrl: result.avatarUrl }); // Immediately update client-side user state
                setIsAvatarDialogOpen(false);
                setAvatarFile(null);
                setAvatarPreview(null);
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
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
        <>
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
                        <div className="grid gap-4 grid-cols-[auto,1fr] items-center">
                            <div className="relative">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={user.avatarUrl || ''} alt={user.username} key={user.avatarUrl} />
                                    <AvatarFallback className="text-3xl">{user.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Button size="icon" variant="secondary" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full" onClick={() => setIsAvatarDialogOpen(true)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
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
                        </div>

                         <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={user.email} disabled />
                            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
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
                         <Button onClick={handleSaveChanges} disabled={isSaving || username.length < 3}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
        
        {/* Avatar Upload Dialog */}
        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Profile Picture</DialogTitle>
                    <DialogDescription>
                        Upload a new image to use as your avatar. Square images work best.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <div 
                        className="relative mx-auto w-48 h-48 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center text-center cursor-pointer hover:bg-muted"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {avatarPreview ? (
                            <Image src={avatarPreview} alt="Avatar preview" layout="fill" className="rounded-full object-cover" />
                        ) : user.avatarUrl ? (
                             <Image src={user.avatarUrl} alt="Current avatar" layout="fill" className="rounded-full object-cover" />
                        ) : (
                            <span className="text-sm text-muted-foreground">Click to upload</span>
                        )}
                    </div>
                    <Input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/png, image/jpeg, image/webp" 
                        onChange={handleAvatarSelect}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAvatarUpload} disabled={isUploading || !avatarFile}>
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upload & Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
