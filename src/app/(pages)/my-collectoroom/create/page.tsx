
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
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
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

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
            const docRef = await addDoc(collection(db, "collections"), {
                userId: user.uid,
                name: collectionName,
                description,
                keywords,
                category,
                isPublic,
                cardCount: 0,
                coverImage: `https://picsum.photos/seed/${Math.random()}/400/300`,
                coverImageHint: 'collection placeholder'
            });

            toast({
                title: "Success!",
                description: `Collection "${collectionName}" has been created.`,
            });
            router.push(`/collections/${docRef.id}`);

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
                            <Label htmlFor="keywords">Keywords</Label>
                            <Input id="keywords" placeholder="e.g., comic books, vintage, DC, Marvel" value={keywords} onChange={e => setKeywords(e.target.value)} disabled={isCreating} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="A brief description of what your collection is about." value={description} onChange={e => setDescription(e.target.value)} disabled={isCreating} />
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
                    <Button onClick={handleCreateCollection} disabled={isCreating || !collectionName || !category}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isCreating ? 'Creating...' : 'Create Collection'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
