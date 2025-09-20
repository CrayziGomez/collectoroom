
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2 } from "lucide-react";
import Link from "next/link";
import { MOCK_COLLECTIONS } from "@/lib/constants";
import { notFound } from "next/navigation";
import { CARD_STATUSES } from "@/lib/constants";
import { useState }from "react";
import { generateCardDescription } from "@/ai/flows/card-description-generator";
import { useToast } from "@/hooks/use-toast";


export default function AddCardPage({ params }: { params: { id: string } }) {
    const { toast } = useToast();
    const collection = MOCK_COLLECTIONS.find(c => c.id === params.id);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
  
    if (!collection) {
      notFound();
    }

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const result = await generateCardDescription({
                title: title,
                category: collection.category,
                existingDescription: description,
            });
            if (result.suggestedDescription) {
                setDescription(result.suggestedDescription);
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

    return (
        <div className="container py-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline">Add Card to "{collection.name}"</h1>
                    <p className="text-muted-foreground">Fill in the details for your new card.</p>
                </div>

                <Card>
                    <CardContent className="p-6 grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Card Title</Label>
                            <Input id="title" placeholder="e.g., Action Comics #1" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="Details about the item, its condition, history, etc." value={description} onChange={(e) => setDescription(e.target.value)} />
                            <Button variant="outline" className="w-fit text-sm" onClick={handleGenerateDescription} disabled={isGenerating || !title}>
                                <Wand2 className="mr-2 h-4 w-4" /> 
                                {isGenerating ? 'Generating...' : 'Suggest with AI'}
                            </Button>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="image">Image</Label>
                            <Input id="image" type="file" />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                             <Select>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CARD_STATUSES.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" asChild><Link href={`/collections/${params.id}`}>Cancel</Link></Button>
                    <Button>Add Card</Button>
                </div>
            </div>
        </div>
    );
}
