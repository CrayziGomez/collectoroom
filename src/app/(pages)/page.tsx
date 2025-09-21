
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Database, Edit3, Share2, Pencil, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORIES } from '@/lib/constants';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useAuth } from '@/contexts/auth-context';
import type { SiteContent } from '@/lib/types';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAdminInstances } from '@/lib/firebase-admin';

const storage = getStorage(app);

// This is a simplified, non-Genkit version of the server-side action.
// In a real app, this would be a proper Next.js Server Action file.
async function updateSiteContent(input: any) {
  'use server';
  // This is a placeholder for proper admin verification
  // A real implementation would use a library like `next-auth` or verify the token
  // with the Firebase Admin SDK. For now, we assume if you can call this, you're an admin.
  
  // This logic is now simplified and directly inside the Server Action
  try {
    const { adminDb } = getAdminInstances();
    const docRef = doc(adminDb, 'siteContent', input.id);
    const { id, ...content } = input;
    await setDoc(docRef, content, { merge: true });
    return { success: true, message: 'Content updated successfully.' };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return { success: false, message: `Update failed: ${error.message}` };
  }
}

async function getSiteContent(input: { pageId: string }): Promise<SiteContent | null> {
    'use server';
    try {
        const { adminDb } = getAdminInstances();
        const docRef = doc(adminDb, 'siteContent', input.pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as SiteContent;
        } else {
             if (input.pageId === 'homePage') {
                return {
                    id: 'homePage',
                    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
                    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
                    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
                    imageHint: 'collection display',
                };
            }
            return null;
        }
    } catch (error) {
        console.error("Error fetching site content:", error);
        // Return default content on error to prevent site crash
         return {
            id: 'homePage',
            title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
            description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
            imageUrl: 'https://picsum.photos/seed/hero/1200/600',
            imageHint: 'collection display',
        };
    }
}


export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Text Dialog State
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  
  // Edit Image Dialog State
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const result = await getSiteContent({ pageId: 'homePage' });
        setContent(result);
      } catch (error) {
        console.error("Error fetching site content:", error);
        toast({ title: 'Error', description: 'Could not load page content.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchContent();
    }
  }, [authLoading, toast]);

  const handleOpenTextDialog = () => {
    if (content) {
      setEditedTitle(content.title.replace(/<br \/>/g, '\n').replace(/<\/?span[^>]*>/g, ''));
      setEditedDescription(content.description);
      setIsTextDialogOpen(true);
    }
  };

  const handleSaveText = async () => {
    if (!user || !content) return;
    setIsSavingText(true);
    try {
      const formattedTitle = editedTitle
        .replace(/\n/g, '<br />')
        .replace(/Digitized & Showcased./g, '<span class="text-primary">Digitized &amp; Showcased.</span>');

      const result = await updateSiteContent({
        id: content.id,
        title: formattedTitle,
        description: editedDescription,
      });

      if (result.success) {
        toast({ title: 'Success', description: 'Hero content updated!' });
        setIsTextDialogOpen(false);
        setContent(prev => prev ? { ...prev, title: formattedTitle, description: editedDescription } : null);
      } else {
        throw new Error(result.message);
      }

    } catch (error: any) {
      console.error("Error updating content:", error);
      toast({ title: 'Error', description: error.message || 'Failed to update content.', variant: 'destructive' });
    } finally {
      setIsSavingText(false);
    }
  };

  const handleOpenImageDialog = () => {
    setImageFile(null);
    setImagePreview(content?.imageUrl || null);
    setIsImageDialogOpen(true);
  };
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSaveImage = async () => {
    if (!user || !content || !imageFile) return;
    setIsSavingImage(true);

    try {
      const storageRef = ref(storage, `site-content/homePage-hero-${Date.now()}`);
      const uploadResult = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      const result = await updateSiteContent({
        id: content.id,
        imageUrl: downloadURL,
      });
      
      if (result.success) {
        toast({ title: 'Success', description: 'Hero image updated!' });
        setIsImageDialogOpen(false);
        setContent(prev => prev ? { ...prev, imageUrl: downloadURL } : null);
      } else {
        throw new Error(result.message);
      }

    } catch (error: any) {
      console.error("Error updating image:", error);
      toast({ title: 'Error', description: error.message || 'Failed to update image.', variant: 'destructive' });
    } finally {
      setIsSavingImage(false);
    }
  };
  
  const heroContent = content || {
    id: 'homePage',
    title: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
    description: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
    imageUrl: 'https://picsum.photos/seed/hero/1200/600',
    imageHint: 'collection display'
  };

  const howItWorksSteps = [
    {
      icon: Edit3,
      title: 'Create Your Cards',
      description: 'Easily digitize your items with titles, descriptions, and photos.',
    },
    {
      icon: Database,
      title: 'Organize in Collections',
      description: 'Group your cards into themed collections. Keep them private or prepare them for the world to see.',
    },
    {
      icon: Share2,
      title: 'Share Your Passion',
      description: 'Publish your collections to our gallery, share them via a link, and connect with a community of fellow collectors.',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="container py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 text-center md:text-left">
             <div className="relative">
              {user?.isAdmin && !loading && (
                <Button onClick={handleOpenTextDialog} variant="ghost" size="icon" className="absolute -top-4 right-0 h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {loading ? (
                <div className="space-y-4">
                    <div className="h-10 w-3/4 bg-muted animate-pulse rounded-md mx-auto md:mx-0"></div>
                    <div className="h-10 w-1/2 bg-muted animate-pulse rounded-md mx-auto md:mx-0"></div>
                </div>
              ) : (
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tighter"
                  dangerouslySetInnerHTML={{ __html: heroContent.title }}
                />
              )}
            </div>
             {loading ? (
                <div className="h-12 w-full bg-muted animate-pulse rounded-md max-w-xl mx-auto md:mx-0"></div>
              ) : (
                <p className="max-w-xl mx-auto md:mx-0 text-lg text-muted-foreground">
                  {heroContent.description}
                </p>
             )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button size="lg" asChild>
                <Link href="/signup">Start Your Collection <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/gallery">Explore the Gallery</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            {loading ? (
              <div className="rounded-lg shadow-lg aspect-video bg-muted animate-pulse" />
            ) : (
              <Image
                src={heroContent.imageUrl || 'https://picsum.photos/seed/hero/1200/600'}
                alt={heroContent.description}
                width={600}
                height={400}
                className="rounded-lg shadow-lg aspect-video object-cover"
                data-ai-hint={heroContent.imageHint}
                key={heroContent.imageUrl}
              />
            )}
            {user?.isAdmin && !loading && (
              <Button onClick={handleOpenImageDialog} variant="secondary" size="icon" className="absolute top-4 right-4 h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted py-12 md:py-24">
        <div className="container">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Three simple steps to bring your collection online.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map(step => (
              <Card key={step.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="mt-4">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container py-12 md:py-24">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Explore by Category</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Discover public collections across a wide range of interests.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(category => (
            <Link href={`/gallery?category=${encodeURIComponent(category.name)}`} key={category.id}>
              <div className="group flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent/10 hover:shadow-md transition-all h-full">
                <CategoryIcon categoryName={category.name} className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="mt-2 text-sm font-semibold text-center">{category.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Edit Text Dialog */}
       <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hero Content</DialogTitle>
            <DialogDescription>
              Make changes to the main title and description on the home page. Use a new line for the title's second line. The "Digitized & Showcased." part will be automatically highlighted.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Textarea
                id="title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="min-h-[100px]"
                placeholder="Enter title. Use new lines for line breaks."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveText} disabled={isSavingText}>
              {isSavingText && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hero Image</DialogTitle>
            <DialogDescription>
              Upload a new image for the hero section banner. Recommended size: 1200x600.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div 
                className="relative border-2 border-dashed border-muted-foreground rounded-lg p-4 text-center cursor-pointer hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
              >
                  {imagePreview ? (
                     <Image src={imagePreview} alt="New image preview" width={400} height={200} className="w-full h-auto object-contain rounded-md" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UploadCloud className="h-10 w-10" />
                      <p>Click or drag to upload an image</p>
                    </div>
                  )}
              </div>
              <Input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif, image/webp" 
                onChange={handleImageSelect}
              />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveImage} disabled={isSavingImage || !imageFile}>
              {isSavingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
