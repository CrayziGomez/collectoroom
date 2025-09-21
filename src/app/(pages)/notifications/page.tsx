
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Loader2, BellOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        setLoading(true);
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(notificationsQuery, (querySnapshot) => {
            const notificationsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
            setNotifications(notificationsData);
            setLoading(false);

            // Mark notifications as read
            const unread = querySnapshot.docs.filter(doc => !doc.data().isRead);
            if (unread.length > 0) {
                const batch = writeBatch(db);
                unread.forEach(doc => {
                    batch.update(doc.ref, { isRead: true });
                });
                batch.commit().catch(console.error);
            }
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, router]);

    if (authLoading || loading) {
        return (
            <div className="container py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="container py-8 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">Notifications</h1>
            </div>
            
            {notifications.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <BellOff className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No notifications yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Follow collectors to get updates on their new collections.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map(notif => (
                        <Link href={notif.link} key={notif.id}>
                            <Card className={cn("hover:bg-muted/50 transition-colors", !notif.isRead && "bg-primary/5 border-primary/20")}>
                                <CardContent className="p-4 flex items-start gap-4">
                                     {!notif.isRead && (
                                        <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                    )}
                                    <div className={cn("flex-grow overflow-hidden", notif.isRead && "pl-5")}>
                                        <p className={cn("text-sm", !notif.isRead && "font-semibold")}>
                                          {notif.message}
                                        </p>
                                        {notif.timestamp && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
