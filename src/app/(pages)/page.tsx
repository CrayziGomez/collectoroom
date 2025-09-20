import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Database, Edit3, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CATEGORIES } from '@/lib/constants';
import { CategoryIcon } from '@/components/CategoryIcon';

export default function HomePage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-image');

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
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tighter">
              Your Collection, <br />
              <span className="text-primary">Digitized &amp; Showcased.</span>
            </h1>
            <p className="max-w-xl mx-auto md:mx-0 text-lg text-muted-foreground">
              CollectoRoom is the ultimate platform for enthusiasts to catalog, manage, and share their passions. From vintage toys to rare art, your collection deserves a digital home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button size="lg" asChild>
                <Link href="/signup">Start Your Collection <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/gallery">Explore the Gallery</Link>
              </Button>
            </div>
          </div>
          <div>
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                width={600}
                height={400}
                className="rounded-lg shadow-lg aspect-video object-cover"
                data-ai-hint={heroImage.imageHint}
              />
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

    </>
  );
}
