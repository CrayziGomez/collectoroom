
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category } from '@/lib/types';
import { createCollection } from "@/app/actions/collection-actions";


export default function CreateCollectionPage() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [collectionName, setCollectionName] = useState('');
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
    
    // Cover Image State
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
        
        const fetchCategories = async () => {
            setIsCategoriesLoading(true);
            const querySnapshot = await getDocs(collection(db, 'categories'));
            const categoriesData = querySnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Category);
            setCategories(categoriesData);
            setIsCategoriesLoading(false);
        };
        
        fetchCategories();

    }, [user, authLoading, router]);

    const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({ title: 'File too large', description: 'Please select an image under 5MB.', variant: 'destructive'});
                return;
            }
            setCoverImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setCoverImagePreview(previewUrl);
        }
    };
    
    const handleCreateCollection = async () => {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to create a collection.", variant: "destructive" });
            return;
        }
        if (!collectionName || !category || !coverImageFile) {
            toast({ title: "Validation Error", description: "Name, Category, and a Cover Image are required.", variant: "destructive" });
            return;
        }

        setIsCreating(true);

        try {
            const formData = new FormData();
            formData.append('userId', user.uid);
            formData.append('name', collectionName);
            formData.append('description', description);
            formData.append('keywords', keywords);
            formData.append('category', category);
            formData.append('isPublic', String(isPublic));
            formData.append('coverImage', coverImageFile);
            
            const result = await createCollection(formData);

            if (result.success && result.collectionId) {
                 toast({
                    title: "Success!",
                    description: `Collection "${collectionName}" has been created.`,
                });
                router.push(`/collections/${result.collectionId}`);
            } else {
                throw new Error(result.message || "An unknown error occurred.");
            }

        } catch (error: any) {
            console.error("Error creating collection:", error);
            toast({
                title: "Creation Failed",
                description: error.message || "There was an error creating your collection.",
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
                    <CardContent className="p-6 grid gap-6">
                        <div className="grid gap-2">
                             <Label htmlFor="cover-image">Cover Image</Label>
                              <div 
                                className="relative border-2 border-dashed border-muted-foreground rounded-lg p-4 text-center cursor-pointer hover:bg-muted aspect-[4/3] flex items-center justify-center"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {coverImagePreview ? (
                                    <Image src={coverImagePreview} alt="Cover image preview" layout="fill" className="object-cover rounded-md" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <UploadCloud className="h-10 w-10" />
                                    <p className="font-semibold">Click to upload an image</p>
                                    <p className="text-xs">PNG, JPG, WEBP up to 5MB</p>
                                    </div>
                                )}
                            </div>
                            <Input 
                                ref={fileInputRef}
                                id="cover-image"
                                type="file" 
                                className="hidden" 
                                accept="image/png, image/jpeg, image/webp" 
                                onChange={handleCoverImageSelect}
                                disabled={isCreating}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Collection Name</Label>
                            <Input id="name" placeholder="e.g., Vintage Comic Books" value={collectionName} onChange={e => setCollectionName(e.target.value)} disabled={isCreating} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="keywords">Keywords</Label>
                            <Input id="keywords" placeholder="e.g., comic books, vintage, DC, Marvel" value={keywords} onChange={e => setKeywords(e.target.value)} disabled={isCreating} />
                             <p className="text-xs text-muted-foreground">Comma-separated keywords help others discover your collection.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="A brief description of what your collection is about." value={description} onChange={e => setDescription(e.target.value)} disabled={isCreating} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                             <Select onValueChange={setCategory} value={category} disabled={isCreating || isCategoriesLoading}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder={isCategoriesLoading ? 'Loading...' : 'Select a category'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
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
                    <Button onClick={handleCreateCollection} disabled={isCreating || !collectionName || !category || !coverImageFile}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isCreating ? 'Creating...' : 'Create Collection'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
