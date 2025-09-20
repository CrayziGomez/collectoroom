import Link from 'next/link';
import { Layers3 } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="CollectoRoom Home">
      <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
        <Layers3 className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold tracking-tight">
        <span className="text-primary">Collecto</span>
        <span className="text-accent">Room</span>
      </span>
    </Link>
  );
}
