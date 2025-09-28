
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound, useRouter, useParams } from "next/navigation";
import { CARD_STATUSES } from "@/lib/constants";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Card as CardType, Collection, ImageRecord } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteCard, updateCard } from "@/app/actions/card-actions";

const MAX_DESC_WORDS = 500;
const MAX_TITLE_WORDS = 10;
const MAX_IMAGES = 5;

export default function EditCardPage() {
    const params = useParams();
    const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
    const cardId = Array.isArray(params.cardId) ? params.cardId[0] : params.cardId;
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [cardData, setCardData] = useState<CardType | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('');
    const [existingImages, setExistingImages] = useState<ImageRecord[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);


    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchCard = async () => {
            if (!collectionId || !cardId) return;
            setIsLoading(true);

            const cardRef = doc(db, 'cards', cardId);
            const cardSnap = await getDoc(cardRef);
            if (cardSnap.exists() && cardSnap.data().collectionId === collectionId) {
                const data = cardSnap.data() as CardType;
                 if (data.userId !== user.uid) {
                    toast({ title: "Access Denied", description: "You don't own this card.", variant: "destructive" });
                    router.push('/my-collectoroom');
                    return;
                }
                setCardData({ ...data, id: cardSnap.id });
                setTitle(data.title);
                setDescription(data.description);
                setStatus(data.status);
                setExistingImages(data.images || []);
            } else {
                notFound();
            }
            setIsLoading(false);
        };

        fetchCard();

    }, [user, authLoading, collectionId, cardId, router, toast]);

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

    const titleWordCount = title.split(/\s+/).filter(Boolean).length;
    const descriptionWordCount = description.split(/\s+/).filter(Boolean).length;
    const totalImageCount = existingImages.length + newImageFiles.length;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const totalImages = existingImages.length + newImageFiles.length + files.length;

            if (totalImages > MAX_IMAGES) {
                toast({ title: `You can only have a maximum of ${MAX_IMAGES} images.`, variant: 'destructive'});
                return;
            }

            const currentNewFiles = [...newImageFiles, ...files];
            setNewImageFiles(currentNewFiles);

            const currentNewPreviews = currentNewFiles.map(file => URL.createObjectURL(file));
            setNewImagePreviews(currentNewPreviews);
        }
    };

    const removeNewImage = (index: number) => {
        const updatedFiles = newImageFiles.filter((_, i) => i !== index);
        const updatedPreviews = updatedFiles.map(file => URL.createObjectURL(file));

        URL.revokeObjectURL(newImagePreviews[index]);

        setNewImageFiles(updatedFiles);
        setNewImagePreviews(updatedPreviews);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSaveChanges = async () => {
        if (!cardData || !title || !status) {
            toast({ title: "Validation Error", description: "Title and Status are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('userId', user!.uid);
            formData.append('cardId', cardId);
            formData.append('collectionId', collectionId);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('status', status);
            
            // Pass existing images and new images separately
            formData.append('existingImages', JSON.stringify(existingImages));
            newImageFiles.forEach(file => {
                formData.append('newImages', file);
            });

            const result = await updateCard(formData);

            if (result.success) {
                toast({
                    title: "Card Updated!",
                    description: `"${title}" has been updated.`,
                });
                router.push(`/collections/${collectionId}`);
            } else {
                 throw new Error(result.message || "An unknown error occurred.");
            }

        } catch (error: any) {
            console.error("Error updating card:", error);
            toast({
                title: "Error Updating Card",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteCard = async () => {
        if (!collectionId || !cardId) return;

        setIsDeleting(true);
        try {
            await deleteCard({ cardId, collectionId, images: cardData?.images || [] });
            
            toast({
                title: "Card Deleted",
                description: `The card has been removed from your collection.`,
            });
            router.push(`/collections/${collectionId}`);

        } catch (error) {
             console.error("Error deleting card:", error);
            toast({
                title: "Error Deleting Card",
                description: "Could not delete the card. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    }


    if (isLoading || authLoading || !cardData) {
        return (
            <div className="container py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="container py-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Edit "{cardData.title}"</h1>
                        <p className="text-muted-foreground">Update the details for your card.</p>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this card and all its images.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteCard} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                     {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                     Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <Card>
                    <CardContent className="p-6 grid gap-6">
                        <div className="grid gap-2">
                            <Label>Images ({totalImageCount}/{MAX_IMAGES})</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {existingImages.map((image, index) => (
                                    <div key={image.path} className="relative aspect-square">
                                        <Image src={image.url} alt={`Image ${index + 1}`} layout="fill" className="object-cover rounded-md" />
                                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setExistingImages(existingImages.filter((_, i) => i !== index))}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {newImagePreviews.map((preview, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <Image src={preview} alt={`Preview ${index + 1}`} layout="fill" className="object-cover rounded-md" />
                                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeNewImage(index)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {totalImageCount < MAX_IMAGES && (
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
                                disabled={isSaving || totalImageCount >= MAX_IMAGES}
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
                    <Button onClick={handleSaveChanges} disabled={isSaving || !title || !status || totalImageCount === 0}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
