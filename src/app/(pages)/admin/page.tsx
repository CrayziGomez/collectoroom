
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, Users, Layers, FileText } from 'lucide-react';
import { CATEGORIES, PRICING_TIERS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Collection } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [totalCards, setTotalCards] = useState(0);
    const [dataLoading, setDataLoading] = useState(true);
    
    useEffect(() => {
        if (loading) {
            return; // Wait for auth state to be determined
        }

        if (!user) {
            router.push('/login');
            return;
        }

        if (!user.isAdmin) {
            setDataLoading(false);
            return; // Don't fetch data if user is not an admin
        }

        setDataLoading(true);

        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
            const usersData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User);
            setUsers(usersData);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setDataLoading(false);
        });

        const collectionsQuery = query(collection(db, 'collections'));
        const unsubscribeCollections = onSnapshot(collectionsQuery, (snapshot) => {
           const collectionsData = snapshot.docs.map(doc => doc.data() as Collection);
           setCollections(collectionsData);
           const totalCardCount = collectionsData.reduce((sum, coll) => sum + (coll.cardCount || 0), 0);
           setTotalCards(totalCardCount);
        }, (error) => {
            console.error("Error fetching collections:", error);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeCollections();
        };
    }, [user, loading, router]);

    const handleTierChange = async (userId: string, newTier: User['tier']) => {
        const userRef = doc(db, 'users', userId);
        try {
            await updateDoc(userRef, { tier: newTier });
            toast({
                title: 'Success',
                description: `User tier has been updated to ${newTier}.`,
            });
        } catch (error: any) {
            console.error("Error updating tier:", error);
            toast({
                title: 'Error',
                description: 'Failed to update user tier. Please try again.',
                variant: 'destructive',
            });
        }
    };


    if (loading || dataLoading) {
      return (
        <div className="container py-8 space-y-8">
            <Skeleton className="h-12 w-1/3" />
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
             <div className="grid gap-8 md:grid-cols-2">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
             </div>
        </div>
      )
    }

    if (!user?.isAdmin) {
        return (
            <div className="container py-8">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to view this page.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, categories, and view platform statistics.</p>
      </div>
      
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage platform users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No users found.</TableCell>
                  </TableRow>
                ) : (
                  users.map(u => (
                    <TableRow key={u.uid}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {u.isAdmin ? (
                           <Badge variant="destructive">Admin</Badge>
                        ) : (
                          <Select
                            value={u.tier}
                            onValueChange={(newTier: User['tier']) => handleTierChange(u.uid, newTier)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRICING_TIERS.filter(t => t.name !== 'Curator').map(tier => (
                                <SelectItem key={tier.name} value={tier.name} disabled={tier.isComingSoon}>{tier.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive" disabled={u.uid === user.uid}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user account
                                  and remove their data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Category Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Category Management</CardTitle>
              <CardDescription>Create and manage collection categories.</CardDescription>
            </div>
            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORIES.map(category => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
