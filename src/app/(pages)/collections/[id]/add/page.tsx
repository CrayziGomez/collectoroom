
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter, useParams } from "next/navigation";
import { CARD_STATUSES } from "@/lib/constants";
import { useState, useEffect } from "react";
import { generateCardDescription } from "@/ai/flows/card-description-generator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, updateDoc, increment } from "firebase/firestore";
import type { Collection } from "@/lib/types";

const MAX_WORDS = 500;

export default function AddCardPage() {
    const params = useParams();
    const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('');

    const [isGenerating, setIsGenerating] = useState(false);
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
    
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= MAX_WORDS) {
            setDescription(text);
        } else {
            // Trim the text to the first MAX_WORDS words
            const trimmedText = words.slice(0, MAX_WORDS).join(' ');
            setDescription(trimmedText);
        }
    };

    const wordCount = description.split(/\s+/).filter(Boolean).length;


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
                if (words.length > MAX_WORDS) {
                    const trimmedText = words.slice(0, MAX_WORDS).join(' ');
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

    const handleAddCard = async () => {
        if (!user || !collectionData) {
            toast({ title: "Error", description: "You must be logged in and have a collection.", variant: "destructive" });
            return;
        }
        if (!title || !status) {
            toast({ title: "Validation Error", description: "Title and Status are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            // Use a placeholder image instead of uploading a file
            const randomSeed = Math.floor(Math.random() * 1000);
            const imageUrl = `https://picsum.photos/seed/${randomSeed}/300/400`;
            const imageHint = `${collectionData.category} card`;

            // Create card document in Firestore
            await addDoc(collection(db, "cards"), {
                collectionId: collectionData.id,
                userId: user.uid,
                title,
                description,
                status,
                imageUrl,
                imageHint,
                category: collectionData.category,
            });

            // Increment cardCount on the collection
            const collectionRef = doc(db, 'collections', collectionData.id);
            await updateDoc(collectionRef, {
                cardCount: increment(1)
            });

            toast({
                title: "Card Added!",
                description: `"${title}" has been added to your collection.`,
            });
            router.push(`/collections/${collectionData.id}`);

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
                    <CardContent className="p-6 grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Card Title</Label>
                            <Input id="title" placeholder="e.g., Action Comics #1" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="grid gap-2">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="description">Description</Label>
                                <span className="text-sm text-muted-foreground">{wordCount}/{MAX_WORDS} words</span>
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
                    <Button onClick={handleAddCard} disabled={isSaving || !title || !status}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? 'Adding...' : 'Add Card'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
