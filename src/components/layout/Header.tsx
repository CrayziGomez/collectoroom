
'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { UserNav } from '../UserNav';
import { Bell, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Separator } from '../ui/separator';

export function Header() {
  const { user, isLoaded } = useUser(); 
  const pathname = usePathname();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let mounted = true;
    let handle: number | undefined;

    async function fetchCounts() {
      if (!user || !isLoaded) return;
      try {
        const res = await fetch('/api/notifications/counts');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setUnreadChatsCount(data.unreadChats || 0);
        setUnreadNotificationsCount(data.unreadNotifications || 0);
      } catch (e) {
        console.error('Error fetching notification counts', e);
      }
    }

    fetchCounts();
    handle = window.setInterval(fetchCounts, 15000);

    return () => { mounted = false; if (handle) clearInterval(handle); };
  }, [user, isLoaded]);
  
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
      if (link.auth === 'required' && isLoaded && user) return true;
      return false;
  });


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        
        {isClient && (
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Main Menu</SheetTitle>
                    <SheetDescription>
                      Navigate through the CollectoRoom application.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mb-4">
                    <Logo />
                  </div>
                  <Separator />
                  <nav className="flex-grow flex flex-col gap-4 text-lg font-medium mt-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center justify-between transition-colors hover:text-foreground",
                          pathname === link.href ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <span>{link.label}</span>
                        {link.badge && link.badge > 0 ? (
                          <Badge variant="destructive">{link.badge}</Badge>
                        ) : null}
                      </Link>
                    ))}
                  </nav>
                  {isLoaded && !user && (
                      <div className="mt-auto">
                          <Separator className="my-4" />
                          <div className="flex flex-col gap-2">
                              <Button asChild>
                                  <Link href="/signup">Sign Up</Link>
                              </Button>
                              <Button variant="outline" asChild>
                                  <Link href="/login">Log in</Link>
                              </Button>
                          </div>
                      </div>
                  )}
                </SheetContent>
              </Sheet>
          </div>
        )}

        {/* Desktop Logo & Nav */}
        <div className="hidden md:flex md:items-center md:gap-6">
            <Logo />
            <nav className="flex items-center space-x-6 text-sm font-medium">
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
        </div>
        
        <div className="flex-1 md:hidden">
            <div className="flex justify-center">
                 <Logo />
            </div>
        </div>


        {/* Right side actions */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isClient && (
            <>
              {isLoaded && !user && (
                <div className="hidden md:flex items-center gap-2">
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
