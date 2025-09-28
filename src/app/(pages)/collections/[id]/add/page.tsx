
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound, useRouter, useParams } from "next/navigation";
import { CARD_STATUSES } from "@/lib/constants";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Collection } from "@/lib/types";
import { createCard } from "@/app/actions/card-actions";

const MAX_DESC_WORDS = 500;
const MAX_TITLE_WORDS = 10;
const MAX_IMAGES = 5;

export default function AddCardPage() {
    const params = useParams();
    const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isCollectionLoading, setIsCollectionLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchCollection = async () => {
            if (!collectionId) return;
            setIsCollectionLoading(true);
            const collectionRef = doc(db, 'collections', collectionId);
            const collectionSnap = await getDoc(collectionRef);

            if (collectionSnap.exists()) {
                const data = collectionSnap.data() as Collection;
                if (data.userId !== user.uid) {
                    toast({ title: "Access Denied", description: "You don't own this collection.", variant: "destructive" });
                    router.push('/my-collectoroom');
                } else {
                    setCollectionData({ ...data, id: collectionSnap.id });
                }
            } else {
                notFound();
            }
            setIsCollectionLoading(false);
        };

        fetchCollection();

    }, [user, authLoading, collectionId, router, toast]);
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= MAX_TITLE_WORDS) {
            setTitle(text);
        } else {
            const trimmedText = words.slice(0, MAX_TITLE_WORDS).join(' ');
            setTitle(trimmedText);
        }
    };
    
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= MAX_DESC_WORDS) {
            setDescription(text);
        } else {
            const trimmedText = words.slice(0, MAX_DESC_WORDS).join(' ');
            setDescription(trimmedText);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const totalImages = imageFiles.length + files.length;

            if (totalImages > MAX_IMAGES) {
                toast({ title: `You can only upload a maximum of ${MAX_IMAGES} images.`, variant: 'destructive'});
                return;
            }

            const newFiles = [...imageFiles, ...files];
            setImageFiles(newFiles);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setImagePreviews(newPreviews);
        }
    };
    
    const removeImage = (index: number) => {
        const newFiles = imageFiles.filter((_, i) => i !== index);
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        
        // Clean up old object URLs
        URL.revokeObjectURL(imagePreviews[index]);

        setImageFiles(newFiles);
        setImagePreviews(newPreviews);

        // Reset file input so the same file can be re-added if desired
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const titleWordCount = title.split(/\s+/).filter(Boolean).length;
    const descriptionWordCount = description.split(/\s+/).filter(Boolean).length;

    const handleAddCard = async () => {
        if (!user || !collectionData) {
            toast({ title: "Error", description: "You must be logged in and have a collection.", variant: "destructive" });
            return;
        }
        if (!title || !status || imageFiles.length === 0) {
            toast({ title: "Validation Error", description: "Title, Status, and at least one image are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const formData = new FormData();
        formData.append('userId', user.uid);
        formData.append('collectionId', collectionData.id);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('status', status);
        formData.append('category', collectionData.category);

        imageFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            const result = await createCard(formData);

            if (result.success && result.cardId) {
                toast({
                    title: "Card Added!",
                    description: `"${title}" has been added to your collection.`,
                });
                router.push(`/collections/${collectionData.id}`);
            } else {
                 throw new Error(result.message || "An unknown error occurred.");
            }

        } catch (error: any) {
            console.error("Error adding card:", error);
            toast({
                title: "Error Adding Card",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || isCollectionLoading || !collectionData) {
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
                    <h1 className="text-3xl font-bold font-headline">Add Card to "{collectionData.name}"</h1>
                    <p className="text-muted-foreground">Fill in the details for your new card.</p>
                </div>

                <Card>
                    <CardContent className="p-6 grid gap-6">
                        <div className="grid gap-2">
                            <Label>Images ({imageFiles.length}/{MAX_IMAGES})</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <Image src={preview} alt={`Preview ${index + 1}`} layout="fill" className="object-cover rounded-md" />
                                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeImage(index)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {imageFiles.length < MAX_IMAGES && (
                                    <div 
                                        className="relative border-2 border-dashed border-muted-foreground rounded-lg p-4 text-center cursor-pointer hover:bg-muted aspect-square flex items-center justify-center"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                            <UploadCloud className="h-8 w-8" />
                                            <p className="text-xs font-semibold">Click to upload</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Input 
                                ref={fileInputRef}
                                type="file" 
                                className="hidden" 
                                accept="image/png, image/jpeg, image/webp" 
                                onChange={handleImageSelect}
                                disabled={isSaving || imageFiles.length >= MAX_IMAGES}
                                multiple
                            />
                        </div>

                        <div className="grid gap-2">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="title">Card Title</Label>
                                <span className="text-sm text-muted-foreground">{titleWordCount}/{MAX_TITLE_WORDS} words</span>
                            </div>
                            <Input id="title" placeholder="e.g., Action Comics #1" value={title} onChange={handleTitleChange} disabled={isSaving} />
                        </div>
                        <div className="grid gap-2">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="description">Description</Label>
                                <span className="text-sm text-muted-foreground">{descriptionWordCount}/{MAX_DESC_WORDS} words</span>
                            </div>
                            <Textarea id="description" placeholder="Details about the item, its condition, history, etc." value={description} onChange={handleDescriptionChange} disabled={isSaving} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                             <Select onValueChange={setStatus} value={status} disabled={isSaving}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CARD_STATUSES.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" asChild disabled={isSaving}><Link href={`/collections/${collectionId}`}>Cancel</Link></Button>
                    <Button onClick={handleAddCard} disabled={isSaving || !title || !status || imageFiles.length === 0}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? 'Adding...' : 'Add Card'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
