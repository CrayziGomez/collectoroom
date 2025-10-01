
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { updateSiteContent } from '@/app/actions/site-content';
import type { SiteContent, Category, HowItWorksStep } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface HomePageClientContentProps {
  initialContent: SiteContent | null;
  initialCategories: Category[];
  initialHeroContent: SiteContent;
  initialHowItWorksSteps: HowItWorksStep[];
}

export function HomePageClientContent({ 
  initialContent, 
  initialCategories,
  initialHeroContent,
  initialHowItWorksSteps
}: HomePageClientContentProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [content, setContent] = useState<SiteContent | null>(initialContent);
  const [categories] = useState<Category[]>(initialCategories);
  const [heroContent, setHeroContent] = useState<SiteContent>(initialHeroContent);
  const [howItWorksSteps, setHowItWorksSteps] = useState<HowItWorksStep[]>(initialHowItWorksSteps);

  const [isHowItWorksDialogOpen, setIsHowItWorksDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<HowItWorksStep | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isSavingHowItWorks, setIsSavingHowItWorks] = useState(false);
  
  useEffect(() => {
    setContent(initialContent);
    setHeroContent(initialHeroContent);
    setHowItWorksSteps(initialHowItWorksSteps);
  }, [initialContent, initialHeroContent, initialHowItWorksSteps]);

  const handleOpenHowItWorksDialog = (step: HowItWorksStep, index: number) => {
    setEditingStep({ ...step });
    setEditingStepIndex(index);
    setIsHowItWorksDialogOpen(true);
  };
  
  const handleSaveHowItWorks = async () => {
    if (!user || !content || editingStep === null || editingStepIndex === null) return;
    setIsSavingHowItWorks(true);
    try {
        const updatedSteps = [...howItWorksSteps];
        updatedSteps[editingStepIndex] = editingStep;

        const formData = new FormData();
        formData.append('id', content.id);
        formData.append('howItWorksSteps', JSON.stringify(updatedSteps));

        const result = await updateSiteContent(formData);

        if (result.success) {
            toast({ title: 'Success', description: 'Step updated!' });
            setIsHowItWorksDialogOpen(false);
            setHowItWorksSteps(updatedSteps);
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to update step.', variant: 'destructive' });
    } finally {
        setIsSavingHowItWorks(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="container py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 text-center md:text-left">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tighter"
              dangerouslySetInnerHTML={{ __html: heroContent.title }}
            />
            <p className="max-w-xl mx-auto md:mx-0 text-lg text-muted-foreground">
              {heroContent.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button size="lg" asChild>
                <Link href={user ? '/my-collectoroom/create' : '/signup'}>Start Your Collection <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/gallery">Explore the Gallery</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <Image
              src={heroContent.imageUrl || 'https://picsum.photos/seed/hero/1200/600'}
              alt={heroContent.description}
              width={600}
              height={400}
              className="rounded-lg shadow-lg aspect-video object-cover"
              data-ai-hint={heroContent.imageHint}
              key={heroContent.imageUrl}
              priority // Ensure hero image loads quickly
            />
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
            {howItWorksSteps.map((step, index) => (
              <Card key={index} className="text-center relative group">
                 {user?.isAdmin && (
                  <Button onClick={() => handleOpenHowItWorksDialog(step, index)} variant="secondary" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <CardHeader>
                  <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                    <CategoryIcon categoryName={step.icon} className="h-8 w-8 text-primary" />
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
          {categories.map(category => (
            <Link href={`/gallery?category=${encodeURIComponent(category.name)}`} key={category.id}>
              <div className="group flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent/10 hover:shadow-md transition-all h-full">
                <CategoryIcon categoryName={category.icon} className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="mt-2 text-sm font-semibold text-center">{category.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Edit How It Works Dialog */}
      <Dialog open={isHowItWorksDialogOpen} onOpenChange={setIsHowItWorksDialogOpen}>
          <DialogContent>
              <DialogHeader>
              <DialogTitle>Edit Step: {editingStep?.title}</DialogTitle>
              <DialogDescription>
                  Update the title and description for this step. The icon cannot be changed.
              </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                  <Label htmlFor="hiw-title">Title</Label>
                  <Input
                  id="hiw-title"
                  value={editingStep?.title || ''}
                  onChange={(e) => setEditingStep(prev => prev ? { ...prev, title: e.target.value } : null)}
                  />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="hiw-description">Description</Label>
                  <Textarea
                  id="hiw-description"
                  value={editingStep?.description || ''}
                  onChange={(e) => setEditingStep(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="min-h-[120px]"
                  />
              </div>
              </div>
              <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveHowItWorks} disabled={isSavingHowItWorks}>
                  {isSavingHowItWorks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Step
              </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
