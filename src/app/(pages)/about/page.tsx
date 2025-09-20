
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-12">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold font-headline">About CollectoRoom</h1>
        <div className="prose dark:prose-invert max-w-none text-foreground/80 space-y-4">
          <p>
            Welcome to CollectoRoom, the premier digital destination for collectors of all kinds. Our mission is to provide a beautiful, intuitive, and powerful platform for you to catalog, manage, and share your passions with the world.
          </p>
          <p>
            We believe that every collection tells a story. Whether you collect stamps, vintage toys, rare books, or anything in between, CollectoRoom is designed to help you tell that story. Our platform allows you to create detailed digital cards for each of your items, complete with photos and descriptions. You can then organize these cards into curated collections, which can be kept private for your own records or made public to share with a global community of fellow enthusiasts.
          </p>
          <p>
            Key features of CollectoRoom include:
          </p>
          <ul>
            <li><strong>Digital Card Creation:</strong> Easily create digital representations of your items with rich details.</li>
            <li><strong>Collection Management:</strong> Organize your cards into public or private collections.</li>
            <li><strong>Community Gallery:</strong> Explore a vast gallery of public collections from users around the world.</li>
            <li><strong>Tiered Plans:</strong> From casual hobbyists to professional curators, we have a plan that fits your needs.</li>
          </ul>
          <p>
            Join CollectoRoom today and give your collection the digital home it deserves.
          </p>
           <div className="not-prose text-center pt-4">
             <Button asChild size="lg">
               <Link href="/pricing">Join Now Free</Link>
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
