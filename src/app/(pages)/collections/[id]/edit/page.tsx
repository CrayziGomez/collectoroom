
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, useParams, notFound } from "next/navigation";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Collection, Category } from "@/lib/types";


export default function EditCollectionPage() {
    const params = useParams();
    const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [collectionName, setCollectionName] = useState('');
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchCollectionAndCategories = async () => {
            if (!collectionId) return;
            setIsLoading(true);

            // Fetch categories
            const catQuerySnapshot = await getDocs(collection(db, 'categories'));
            const categoriesData = catQuerySnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Category);
            setCategories(categoriesData);

            // Fetch collection
            const collectionRef = doc(db, 'collections', collectionId);
            const collectionSnap = await getDoc(collectionRef);

            if (collectionSnap.exists()) {
                const data = collectionSnap.data() as Collection;
                if (data.userId !== user.uid) {
                    toast({ title: "Access Denied", description: "You don't own this collection.", variant: "destructive" });
                    router.push('/my-collectoroom');
                    return;
                }
                setCollectionData({ ...data, id: collectionSnap.id });
                setCollectionName(data.name);
                setDescription(data.description);
                setKeywords(data.keywords || '');
                setCategory(data.category);
                setIsPublic(data.isPublic);
            } else {
                notFound();
            }
            setIsLoading(false);
        };

        fetchCollectionAndCategories();

    }, [user, authLoading, collectionId, router, toast]);

    const handleSaveChanges = async () => {
        if (!user || !collectionData) {
            toast({ title: "Error", description: "Collection data is missing.", variant: "destructive" });
            return;
        }
        if (!collectionName || !category) {
            toast({ title: "Validation Error", description: "Collection Name and Category are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const collectionRef = doc(db, 'collections', collectionData.id);
            await updateDoc(collectionRef, {
                name: collectionName,
                description,
                keywords,
                category,
                isPublic,
            });

            toast({
                title: "Success!",
                description: `Collection "${collectionName}" has been updated.`,
            });
            router.push(`/collections/${collectionData.id}`);

        } catch (error) {
            console.error("Error updating collection:", error);
            toast({
                title: "Update Failed",
                description: "There was an error updating your collection. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading || authLoading || !collectionData) {
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
                    <h1 className="text-3xl font-bold font-headline">Edit "{collectionData.name}"</h1>
                    <p className="text-muted-foreground">Update the details for your collection.</p>
                </div>

                <Card>
                    <CardContent className="p-6 grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Collection Name</Label>
                            <Input id="name" placeholder="e.g., Vintage Comic Books" value={collectionName} onChange={e => setCollectionName(e.target.value)} disabled={isSaving} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="keywords">Keywords</Label>
                            <Input id="keywords" placeholder="e.g., comic books, vintage, DC, Marvel" value={keywords} onChange={e => setKeywords(e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="A brief description of what your collection is about." value={description} onChange={e => setDescription(e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                             <Select onValueChange={setCategory} value={category} disabled={isSaving || categories.length === 0}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder={categories.length === 0 ? 'Loading...' : 'Select a category'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} disabled={isSaving} />
                            <Label htmlFor="isPublic">Make this collection public</Label>
                        </div>

                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" asChild disabled={isSaving}><Link href={`/collections/${collectionId}`}>Cancel</Link></Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
