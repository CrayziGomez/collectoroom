
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Collection, Category, Card as CardType, ImageRecord } from "@/lib/types";
import Image from "next/image";
import { cn } from "@/lib/utils";


export default function EditCollectionPage() {
    const params = useParams();
    const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cardImages, setCardImages] = useState<ImageRecord[]>([]);

    const [collectionName, setCollectionName] = useState('');
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [selectedCoverImage, setSelectedCoverImage] = useState<ImageRecord | null>(null);

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
                setSelectedCoverImage({ url: data.coverImage, path: '', hint: data.coverImageHint });

                // Fetch cards for this collection to get images
                const cardsQuery = query(collection(db, 'cards'), where('collectionId', '==', collectionSnap.id));
                const cardsSnapshot = await getDocs(cardsQuery);
                const images = cardsSnapshot.docs.flatMap(doc => (doc.data() as CardType).images || []);
                setCardImages(images);

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
                ...(selectedCoverImage && { 
                    coverImage: selectedCoverImage.url,
                    coverImageHint: selectedCoverImage.hint,
                })
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
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline">Edit "{collectionData.name}"</h1>
                    <p className="text-muted-foreground">Update the details for your collection.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Collection Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Cover Photo</CardTitle>
                             <CardDescription>Select an image from one of your cards to be the cover photo for this collection.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {cardImages.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                                    {cardImages.map((image, index) => (
                                        <button key={index} className="relative aspect-square rounded-md overflow-hidden focus:ring-2 focus:ring-primary focus:outline-none" onClick={() => setSelectedCoverImage(image)}>
                                            <Image src={image.url} alt={`Card image ${index + 1}`} layout="fill" className="object-cover" />
                                            {selectedCoverImage?.url === image.url && (
                                                <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                                                    <p className="text-primary-foreground font-bold text-sm">Selected</p>
                                                </div>
                                            )}
                                            <div className={cn("absolute inset-0 ring-2 ring-inset ring-transparent", selectedCoverImage?.url === image.url && "ring-primary")}></div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                    <p>No card images available. Add cards with images to this collection to select a cover photo.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>


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

