
'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { UserNav } from '../UserNav';
import { Bell } from 'lucide-react';

export function Header() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    if (loading || !user) {
      setUnreadChatsCount(0);
      setUnreadNotificationsCount(0);
      return;
    }

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      where(`unreadCount.${user.uid}`, '>', 0)
    );

    const unsubscribeChats = onSnapshot(chatsQuery, (querySnapshot) => {
      setUnreadChatsCount(querySnapshot.size);
    });
    
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('isRead', '==', false)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (querySnapshot) => {
      setUnreadNotificationsCount(querySnapshot.size);
    });

    return () => {
      unsubscribeChats();
      unsubscribeNotifications();
    }
  }, [user, loading]);
  
  const totalUnread = unreadChatsCount + unreadNotificationsCount;

  const allNavLinks = [
    { href: '/', label: 'Home', auth: 'always' },
    { href: '/gallery', label: 'Gallery', auth: 'always' },
    { href: '/pricing', label: 'Pricing', auth: 'always' },
    { href: '/messages', label: 'Messages', badge: unreadChatsCount, auth: 'required' },
    { href: '/my-collectoroom', label: 'My CollectoRoom', auth: 'required' },
  ];
  
  const navLinks = allNavLinks.filter(link => {
      if (link.auth === 'always') return true;
      if (link.auth === 'required' && !loading && user) return true;
      return false;
  });


  return (
    <header className="sticky top-0 z-50 w-full border-b border-accent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
           {!loading && !user && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
          {user && (
            <div className="relative">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/notifications">
                  <Bell className="h-5 w-5" />
                   <span className="sr-only">Notifications</span>
                </Link>
              </Button>
               {totalUnread > 0 && (
                <div className="absolute top-0 right-0 h-4 w-4 transform translate-x-1/2 -translate-y-1/2">
                  <Badge variant="destructive" className="h-5 w-5 justify-center p-0">{totalUnread}</Badge>
                </div>
              )}
            </div>
          )}
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
