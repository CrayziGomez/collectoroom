
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Database, Edit3, Share2, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORIES } from '@/lib/constants';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateHomePageContent } from '@/ai/flows/site-content-manager';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface HomePageContent {
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  heroImageHint: string;
}

const defaultContent: HomePageContent = {
  heroTitle: 'Your Collection, <br /> <span class="text-primary">Digitized &amp; Showcased.</span>',
  heroDescription: 'CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.',
  heroImageUrl: 'https://picsum.photos/seed/hero/1200/600',
  heroImageHint: 'collection display',
};


export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<'title' | 'description' | 'image' | null>(null);
  const [editedContent, setEditedContent] = useState({ title: '', description: '', imageUrl: '', imageHint: '' });
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    const contentRef = doc(db, 'siteContent', 'homePage');
    const unsubscribe = onSnapshot(contentRef, (docSnap) => {
      if (docSnap.exists()) {
        setContent(docSnap.data() as HomePageContent);
      } else {
        // If it doesn't exist, create it with default values
        // This should ideally only run once
        setDoc(contentRef, defaultContent);
        setContent(defaultContent);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEditClick = (field: 'title' | 'description' | 'image') => {
    if (!content) return;
    setEditingField(field);
    setEditedContent({
      title: content.heroTitle.replace(/<br \/>/g, '\n').replace(/<span class="text-primary">/g, '').replace(/<\/span>/g, ''),
      description: content.heroDescription,
      imageUrl: content.heroImageUrl,
      imageHint: content.heroImageHint,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingField || !content) return;
    setIsSaving(true);

    let newContent: Partial<HomePageContent> = {};
    if (editingField === 'title') {
      newContent.heroTitle = editedContent.title.replace(/\n/g, '<br />');
    } else if (editingField === 'description') {
      newContent.heroDescription = editedContent.description;
    } else if (editingField === 'image') {
      newContent.heroImageUrl = editedContent.imageUrl;
      newContent.heroImageHint = editedContent.imageHint;
    }

    try {
      await updateHomePageContent(newContent);
      toast({ title: 'Success', description: 'Home page content updated.' });
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to update content:", error);
      toast({ title: 'Error', description: error.message || 'Failed to update content.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const howItWorksSteps = [
    {
      icon: Edit3,
      title: 'Create Your Cards',
      description: 'Easily digitize your items with titles, descriptions, and photos. Our AI can even help you write compelling descriptions.',
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
          <div className="space-y-6 text-center md:text-left relative">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-3/4 mx-auto md:mx-0" />
              </>
            ) : (
              <>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tighter"
                  dangerouslySetInnerHTML={{ __html: content?.heroTitle || '' }}
                />
                <p className="max-w-xl mx-auto md:mx-0 text-lg text-muted-foreground">
                  {content?.heroDescription}
                </p>
                {user?.isAdmin && (
                  <div className="absolute -top-4 -right-4 space-x-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEditClick('title')}><Pencil /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEditClick('description')}><Pencil /></Button>
                  </div>
                )}
              </>
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
             {loading ? <Skeleton className="h-[400px] w-full rounded-lg" /> : (
                content && (
                <Image
                    src={content.heroImageUrl}
                    alt={content.heroDescription}
                    width={600}
                    height={400}
                    className="rounded-lg shadow-lg aspect-video object-cover"
                    data-ai-hint={content.heroImageHint}
                    key={content.heroImageUrl} // Force re-render on image change
                />
             ))}
              {user?.isAdmin && !loading && (
                 <Button variant="outline" size="icon" className="absolute top-4 right-4 h-8 w-8 rounded-full bg-background/50 hover:bg-background" onClick={() => handleEditClick('image')}><Pencil /></Button>
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
            <Link href={`/gallery?category=${category.id}`} key={category.id}>
              <div className="group flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent/10 hover:shadow-md transition-all h-full">
                <CategoryIcon categoryName={category.name} className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="mt-2 text-sm font-semibold text-center">{category.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingField}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingField === 'title' && (
              <div className="grid gap-2">
                <Label htmlFor="title">Hero Title</Label>
                <Textarea
                  id="title"
                  value={editedContent.title}
                  onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                  className="min-h-[100px]"
                  placeholder="Enter title. Use new lines for line breaks."
                />
              </div>
            )}
            {editingField === 'description' && (
              <div className="grid gap-2">
                <Label htmlFor="description">Hero Description</Label>
                <Textarea
                  id="description"
                  value={editedContent.description}
                  onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                  className="min-h-[150px]"
                />
              </div>
            )}
            {editingField === 'image' && (
              <div className="grid gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      value={editedContent.imageUrl}
                      onChange={(e) => setEditedContent({ ...editedContent, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                 </div>
                  <div className="grid gap-2">
                    <Label htmlFor="imageHint">Image AI Hint</Label>
                    <Input
                      id="imageHint"
                      value={editedContent.imageHint}
                      onChange={(e) => setEditedContent({ ...editedContent, imageHint: e.target.value })}
                      placeholder="e.g. collection display"
                    />
                 </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
