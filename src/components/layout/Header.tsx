
'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserNav } from '@/components/UserNav';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Chat } from '@/lib/types';
import { Badge } from '../ui/badge';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadChatsCount(0);
      return;
    }

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      where(`unreadCount.${user.uid}`, '>', 0)
    );

    const unsubscribe = onSnapshot(chatsQuery, (querySnapshot) => {
      setUnreadChatsCount(querySnapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/messages', label: 'Messages', badge: unreadChatsCount },
    { href: '/my-collectoroom', label: 'My CollectoRoom' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
             <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative transition-colors hover:text-foreground/80",
                pathname === link.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              {link.label}
              {link.badge && link.badge > 0 ? (
                 <Badge variant="destructive" className="absolute -right-4 -top-2 h-5 w-5 justify-center p-0">{link.badge}</Badge>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="relative w-full max-w-sm">
            <Input type="search" placeholder="Search collections..." className="pr-10" />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
              <Search className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
