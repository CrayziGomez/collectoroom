
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import GalleryContent from './GalleryContent';

// This is the new parent component. It wraps the actual gallery content
// in a Suspense boundary. This is required by Next.js when a component
// uses client-side hooks like useSearchParams.
export default function GalleryPage() {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <GalleryContent />
    </Suspense>
  );
}

// A skeleton component to show while the main content is loading.
function GallerySkeleton() {
  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Collection Gallery</h1>
        <p className="text-lg text-muted-foreground mt-2">Explore the amazing collections shared by our community.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Skeleton className="h-10 md:col-span-2" />
        <Skeleton className="h-10" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    </div>
  );
}
