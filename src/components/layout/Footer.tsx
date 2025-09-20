
'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useEffect, useState } from 'react';

export function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-2 text-sm text-muted-foreground">
              The modern way to catalog, manage, and showcase your prized collections.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h3 className="font-semibold">Company</h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms &amp; Conditions</Link></li>
                <li><Link href="/terms#privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              </ul>
            </div>
             <div>
              <h3 className="font-semibold">Connect</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Twitter / X</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Instagram</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {year} CollectoRoom. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
