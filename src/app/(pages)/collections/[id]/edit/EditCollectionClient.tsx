"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { updateCollection } from '@/lib/actions/collection-actions';

export default function EditCollectionClient({ initialCollection, initialCategories, initialImages }: any) {
  const router = useRouter();
  const { toast } = useToast();

  const [collectionName, setCollectionName] = useState(initialCollection.name || '');
  const [keywords, setKeywords] = useState(initialCollection.keywords || '');
  const [description, setDescription] = useState(initialCollection.description || '');
  const [category, setCategory] = useState(initialCollection.category || '');
  const [isPublic, setIsPublic] = useState(Boolean(initialCollection.isPublic));
  const [selectedCoverImage, setSelectedCoverImage] = useState<any>(initialCollection.coverImage ? { url: initialCollection.coverImage, hint: initialCollection.coverImageHint } : null);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    if (!collectionName || !category) {
      toast({ title: 'Validation Error', description: 'Collection Name and Category are required.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('id', initialCollection.id);
      fd.append('name', collectionName);
      fd.append('description', description || '');
      fd.append('keywords', keywords || '');
      fd.append('category', category);
      fd.append('isPublic', isPublic ? 'true' : 'false');
      if (selectedCoverImage?.url) {
        fd.append('coverImage', selectedCoverImage.url);
        if (selectedCoverImage.hint) fd.append('coverImageHint', selectedCoverImage.hint);
      }

      const res = await updateCollection(fd);
      if (res.success) {
        toast({ title: 'Success!', description: `Collection "${collectionName}" has been updated.` });
        router.push(`/collections/${initialCollection.id}`);
      } else {
        throw new Error(res.error || 'Failed to update collection');
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Update Failed', description: e.message || 'There was an error updating your collection.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-headline">Edit "{initialCollection.name}"</h1>
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
                <Select onValueChange={setCategory} value={category} disabled={isSaving || !initialCategories}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={!initialCategories ? 'Loading...' : 'Select a category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {initialCategories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(v) => setIsPublic(Boolean(v))} disabled={isSaving} />
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
              {initialImages && initialImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {initialImages.map((image: any, index: number) => (
                    <button key={index} className="relative aspect-square rounded-md overflow-hidden focus:ring-2 focus:ring-primary focus:outline-none" onClick={() => setSelectedCoverImage(image)}>
                      <Image src={image.url} alt={`Card image ${index + 1}`} fill className="object-cover" />
                      {selectedCoverImage?.url === image.url && (
                        <div className="absolute inset-0 bg-primary/70 flex items-center justify-center"><p className="text-primary-foreground font-bold text-sm">Selected</p></div>
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
          <Button variant="outline" asChild disabled={isSaving}><Link href={`/collections/${initialCollection.id}`}>Cancel</Link></Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
