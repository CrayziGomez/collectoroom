"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CARD_STATUSES } from "@/lib/constants";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@clerk/nextjs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteCard, updateCard } from "@/app/actions/card-actions";

const MAX_DESC_WORDS = 500;
const MAX_TITLE_WORDS = 10;
const MAX_IMAGES = 5;

export default function EditCardClient({ initialCard, initialCollection }: any) {
  const collectionId = initialCollection.id;
  const cardId = initialCard.id;
  const { toast } = useToast();
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialCard.title || '');
  const [description, setDescription] = useState(initialCard.description || '');
  const [status, setStatus] = useState(initialCard.status || '');
  const [existingImages, setExistingImages] = useState(initialCard.images || []);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= MAX_TITLE_WORDS) setTitle(text);
    else setTitle(words.slice(0, MAX_TITLE_WORDS).join(' '));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= MAX_DESC_WORDS) setDescription(text);
    else setDescription(words.slice(0, MAX_DESC_WORDS).join(' '));
  };

  const titleWordCount = title.split(/\s+/).filter(Boolean).length;
  const descriptionWordCount = description.split(/\s+/).filter(Boolean).length;
  const totalImageCount = existingImages.length + newImageFiles.length;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const totalImages = existingImages.length + newImageFiles.length + files.length;
    if (totalImages > MAX_IMAGES) { toast({ title: `You can only have a maximum of ${MAX_IMAGES} images.`, variant: 'destructive'}); return; }
    const currentNewFiles = [...newImageFiles, ...files];
    setNewImageFiles(currentNewFiles);
    setNewImagePreviews(currentNewFiles.map(f => URL.createObjectURL(f)));
  };

  const removeNewImage = (index: number) => {
    const updatedFiles = newImageFiles.filter((_, i) => i !== index);
    URL.revokeObjectURL(newImagePreviews[index]);
    setNewImageFiles(updatedFiles);
    setNewImagePreviews(updatedFiles.map(f => URL.createObjectURL(f)));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveChanges = async () => {
    if (!isSignedIn || !user) { router.push('/'); return; }
    if (!title || !status) { toast({ title: 'Validation Error', description: 'Title and Status are required.', variant: 'destructive' }); return; }

    setIsSaving(true);
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('cardId', cardId);
    formData.append('collectionId', collectionId);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('status', status);
    formData.append('category', initialCard.categoryId || '');
    formData.append('existingImages', JSON.stringify(existingImages));
    newImageFiles.forEach(file => formData.append('newImages', file));

    try {
      const result = await updateCard(formData);
      if (result.success) {
        toast({ title: 'Card Updated!', description: `"${title}" has been updated.` });
        router.push(`/collections/${collectionId}`);
      } else throw new Error(result.message || 'Unknown error');
    } catch (e: any) {
      console.error(e); toast({ title: 'Error Updating Card', description: e.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  const handleDeleteCard = async () => {
    if (!isSignedIn || !user) { router.push('/'); return; }
    setIsDeleting(true);
    try {
      const result = await deleteCard({ cardId, collectionId, images: existingImages, userId: user.id });
      if (!result.success) throw new Error(result.message || 'Delete failed');
      toast({ title: 'Card Deleted', description: 'The card has been removed from your collection.' });
      router.push(`/collections/${collectionId}`);
    } catch (e: any) { console.error(e); toast({ title: 'Error Deleting Card', description: e.message || 'Could not delete the card.', variant: 'destructive' }); }
    finally { setIsDeleting(false); }
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline">Edit "{title}"</h1>
            <p className="text-muted-foreground">Update the details for your card.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCard} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card>
          <CardContent className="p-6 grid gap-6">
            <div className="grid gap-2">
              <Label>Images ({totalImageCount}/{MAX_IMAGES})</Label>
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((image: any, index: number) => (
                  <div key={image.path || index} className="relative aspect-square">
                    <Image src={image.url} alt={`Image ${index+1}`} fill className="object-cover rounded-md" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setExistingImages(existingImages.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                {newImagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image src={preview} alt={`Preview ${index+1}`} fill className="object-cover rounded-md" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeNewImage(index)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                {totalImageCount < MAX_IMAGES && (
                  <div className="relative border-2 border-dashed border-muted-foreground rounded-lg p-4 text-center cursor-pointer hover:bg-muted aspect-square flex items-center justify-center" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex flex-col items-center gap-1 text-muted-foreground"><UploadCloud className="h-8 w-8" /><p className="text-xs font-semibold">Click to upload</p></div>
                  </div>
                )}
              </div>
              <Input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageSelect} disabled={isSaving || totalImageCount >= MAX_IMAGES} multiple />
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
              <Textarea id="description" placeholder="Details about the item" value={description} onChange={handleDescriptionChange} disabled={isSaving} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={setStatus} value={status} disabled={isSaving}>
                <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{CARD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" asChild disabled={isSaving}><Link href={`/collections/${collectionId}`}>Cancel</Link></Button>
          <Button onClick={handleSaveChanges} disabled={isSaving || !title || !status || totalImageCount === 0}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{isSaving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </div>
    </div>
  );
}
