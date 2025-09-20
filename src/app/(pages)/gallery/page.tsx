
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOCK_COLLECTIONS, MOCK_USERS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { User, Layers } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

export default function GalleryPage() {
  const publicCollections = MOCK_COLLECTIONS.filter(c => c.isPublic);

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Collection Gallery</h1>
        <p className="text-lg text-muted-foreground mt-2">Explore the amazing collections shared by our community.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Input placeholder="Search by name or keyword..." className="flex-grow" />
        <Select>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {publicCollections.map(collection => {
          const owner = MOCK_USERS.find(u => u.id === collection.userId);
          return (
            <Card key={collection.id} className="overflow-hidden group">
              <Link href={`/collections/${collection.id}`}>
                <CardContent className="p-0">
                  <div className="relative">
                    <Image
                      src={collection.coverImage}
                      alt={`Cover image for ${collection.name}`}
                      width={400}
                      height={300}
                      className="aspect-[4/3] object-cover w-full group-hover:scale-105 transition-transform duration-300"
                      data-ai-hint={collection.coverImageHint}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <Badge variant="secondary" className="absolute top-2 right-2">{collection.category}</Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg truncate group-hover:text-primary">{collection.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 h-[40px] mt-1">{collection.description}</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between text-xs text-muted-foreground p-4 pt-0">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{owner?.username || 'Unknown User'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>{collection.cardCount} cards</span>
                  </div>
                </CardFooter>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
