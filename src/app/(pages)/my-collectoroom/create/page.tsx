
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { Wand2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { generateCollectionDescription } from "@/ai/flows/collection-description-generator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, writeBatch, serverTimestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function CreateCollectionPage() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [collectionName, setCollectionName] = useState('');
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const result = await generateCollectionDescription({ collectionName, keywords });
            if (result.description) {
                setDescription(result.description);
            }
        } catch (error) {
            console.error("AI description generation failed:", error);
            toast({
                title: "Error",
                description: "Failed to generate AI description. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateCollection = async () => {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to create a collection.", variant: "destructive" });
            return;
        }
        if (!collectionName || !category) {
            toast({ title: "Validation Error", description: "Collection Name and Category are required.", variant: "destructive" });
            return;
        }

        setIsCreating(true);

        try {
            const batch = writeBatch(db);

            const collectionRef = doc(collection(db, "collections"));

            const newCollection = {
                userId: user.uid,
                name: collectionName,
                description,
                keywords,
                category,
                isPublic,
                cardCount: 0,
                coverImage: `https://picsum.photos/seed/${Math.random()}/400/300`,
                coverImageHint: 'collection placeholder'
            };
            batch.set(collectionRef, newCollection);


            // If the collection is public, notify followers
            if (isPublic && user.uid) {
                const followersQuery = query(collection(db, `users/${user.uid}/followers`));
                const followersSnapshot = await getDocs(followersQuery);
                
                followersSnapshot.forEach(followerDoc => {
                    const notificationRef = doc(collection(db, `notifications`));
                    batch.set(notificationRef, {
                        recipientId: followerDoc.id,
                        senderId: user.uid,
                        senderName: user.username,
                        type: 'NEW_COLLECTION',
                        message: `${user.username} created a new collection: "${collectionName}"`,
                        link: `/collections/${collectionRef.id}`,
                        isRead: false,
                        timestamp: serverTimestamp(),
                    });
                });
            }

            await batch.commit();

            toast({
                title: "Success!",
                description: `Collection "${collectionName}" has been created.`,
            });
            router.push(`/collections/${collectionRef.id}`);

        } catch (error) {
            console.error("Error creating collection:", error);
            toast({
                title: "Creation Failed",
                description: "There was an error creating your collection. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    }

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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline">Create a New Collection</h1>
                    <p className="text-muted-foreground">Fill in the details below to start your new collection.</p>
                </div>

                <Card>
                    <CardContent className="p-6 grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Collection Name</Label>
                            <Input id="name" placeholder="e.g., Vintage Comic Books" value={collectionName} onChange={e => setCollectionName(e.target.value)} disabled={isCreating} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="keywords">Keywords (for AI suggestions)</Label>
                            <Input id="keywords" placeholder="e.g., comic books, vintage, DC, Marvel" value={keywords} onChange={e => setKeywords(e.target.value)} disabled={isCreating} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="A brief description of what your collection is about." value={description} onChange={e => setDescription(e.target.value)} disabled={isCreating} />
                            <Button variant="outline" className="w-fit text-sm" onClick={handleGenerateDescription} disabled={isGenerating || !collectionName || !keywords || isCreating}>
                                <Wand2 className="mr-2 h-4 w-4" /> 
                                {isGenerating ? 'Generating...' : 'Suggest with AI'}
                            </Button>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                             <Select onValueChange={setCategory} value={category} disabled={isCreating}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} disabled={isCreating} />
                            <Label htmlFor="isPublic">Make this collection public</Label>
                        </div>

                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" asChild disabled={isCreating}><Link href="/my-collectoroom">Cancel</Link></Button>
                    <Button onClick={handleCreateCollection} disabled={isCreating}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isCreating ? 'Creating...' : 'Create Collection'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
