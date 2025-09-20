
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter, useParams } from "next/navigation";
import { CARD_STATUSES } from "@/lib/constants";
import { useState, useEffect } from "react";
import { generateCardDescription } from "@/ai/flows/card-description-generator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import type { Card as CardType, Collection } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const MAX_DESC_WORDS = 500;
const MAX_TITLE_WORDS = 10;

export default function EditCardPage() {
    const params = useParams();
    const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
    const cardId = Array.isArray(params.cardId) ? params.cardId[0] : params.cardId;
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [cardData, setCardData] = useState<CardType | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchCardAndCollection = async () => {
            if (!collectionId || !cardId) return;
            setIsLoading(true);

            // Fetch collection
            const collectionRef = doc(db, 'collections', collectionId);
            const collectionSnap = await getDoc(collectionRef);
            if (!collectionSnap.exists() || collectionSnap.data().userId !== user.uid) {
                toast({ title: "Access Denied", description: "You don't own this collection.", variant: "destructive" });
                router.push('/my-collectoroom');
                return;
            }
            setCollectionData({ ...collectionSnap.data(), id: collectionSnap.id } as Collection);

            // Fetch card
            const cardRef = doc(db, 'cards', cardId);
            const cardSnap = await getDoc(cardRef);
            if (cardSnap.exists() && cardSnap.data().collectionId === collectionId) {
                const data = cardSnap.data() as CardType;
                setCardData({ ...data, id: cardSnap.id });
                setTitle(data.title);
                setDescription(data.description);
                setStatus(data.status);
            } else {
                notFound();
            }
            setIsLoading(false);
        };

        fetchCardAndCollection();

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
            // Trim the text to the first MAX_DESC_WORDS words
            const trimmedText = words.slice(0, MAX_DESC_WORDS).join(' ');
            setDescription(trimmedText);
        }
    };

    const titleWordCount = title.split(/\s+/).filter(Boolean).length;
    const descriptionWordCount = description.split(/\s+/).filter(Boolean).length;
    
    const handleGenerateDescription = async () => {
        if (!collectionData) return;
        setIsGenerating(true);
        try {
            const result = await generateCardDescription({
                title: title,
                category: collectionData.category,
                existingDescription: description,
            });
            if (result.suggestedDescription) {
                 const words = result.suggestedDescription.split(/\s+/).filter(Boolean);
                if (words.length > MAX_DESC_WORDS) {
                    const trimmedText = words.slice(0, MAX_DESC_WORDS).join(' ');
                    setDescription(trimmedText);
                } else {
                    setDescription(result.suggestedDescription);
                }
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
    }

    const handleSaveChanges = async () => {
        if (!cardData || !title || !status) {
            toast({ title: "Validation Error", description: "Title and Status are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const cardRef = doc(db, 'cards', cardId);
            await updateDoc(cardRef, {
                title,
                description,
                status,
            });
            toast({
                title: "Card Updated!",
                description: `"${title}" has been updated.`,
            });
            router.push(`/collections/${collectionId}`);

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
            const cardRef = doc(db, 'cards', cardId);
            await deleteDoc(cardRef);
            
            const collectionRef = doc(db, 'collections', collectionId);
            await updateDoc(collectionRef, { cardCount: increment(-1) });
            
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


    if (isLoading || authLoading || !cardData || !collectionData) {
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
                                    This action cannot be undone. This will permanently delete this card from your collection.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteCard} disabled={isDeleting}>
                                     {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                     Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <Card>
                    <CardContent className="p-6 grid gap-4">
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
                            <Button variant="outline" className="w-fit text-sm" onClick={handleGenerateDescription} disabled={isGenerating || !title || isSaving}>
                                <Wand2 className="mr-2 h-4 w-4" /> 
                                {isGenerating ? 'Generating...' : 'Suggest with AI'}
                            </Button>
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
                    <Button onClick={handleSaveChanges} disabled={isSaving || !title || !status}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
