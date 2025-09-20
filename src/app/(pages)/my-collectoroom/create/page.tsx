
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { Wand2 } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { generateCollectionDescription } from "@/ai/flows/collection-description-generator";
import { useToast } from "@/hooks/use-toast";


export default function CreateCollectionPage() {
    const { toast } = useToast();
    const [collectionName, setCollectionName] = useState('');
    const [keywords, setKeywords] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

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
                            <Input id="name" placeholder="e.g., Vintage Comic Books" value={collectionName} onChange={e => setCollectionName(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="keywords">Keywords</Label>
                            <Input id="keywords" placeholder="e.g., comic books, vintage, DC, Marvel" value={keywords} onChange={e => setKeywords(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="A brief description of what your collection is about." value={description} onChange={e => setDescription(e.target.value)} />
                            <Button variant="outline" className="w-fit text-sm" onClick={handleGenerateDescription} disabled={isGenerating || !collectionName || !keywords}>
                                <Wand2 className="mr-2 h-4 w-4" /> 
                                {isGenerating ? 'Generating...' : 'Suggest with AI'}
                            </Button>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                             <Select>
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
                            <Checkbox id="isPublic" defaultChecked />
                            <Label htmlFor="isPublic">Make this collection public</Label>
                        </div>

                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" asChild><Link href="/my-collectoroom">Cancel</Link></Button>
                    <Button>Create Collection</Button>
                </div>
            </div>
        </div>
    );
}
