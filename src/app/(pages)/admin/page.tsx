
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, Users, Layers, FileText, Loader2 } from 'lucide-react';
import { SEED_CATEGORIES } from '@/lib/constants';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, query, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Collection, Category } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PRICING_TIERS } from '@/lib/constants';
import { addCategory } from '@/app/actions/category-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    // Data states
    const [users, setUsers] = useState<User[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [totalCards, setTotalCards] = useState(0);

    // Loading states
    const [dataLoading, setDataLoading] = useState(true);

    // Dialog state for adding a category
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDesc, setNewCategoryDesc] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    const seedCategories = useCallback(async () => {
        const categoriesRef = collection(db, 'categories');
        toast({ title: 'Seeding database', description: 'Populating categories for the first time...' });
        const batch = writeBatch(db);
        SEED_CATEGORIES.forEach(category => {
          const docRef = doc(categoriesRef);
          batch.set(docRef, category);
        });
        await batch.commit();
        toast({ title: 'Success', description: 'Categories have been seeded.' });
    }, [toast]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        setDataLoading(true);

        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
            const usersData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User);
            setUsers(usersData);
        }, (error) => console.error("Error fetching users:", error));

        const collectionsQuery = query(collection(db, 'collections'));
        const unsubscribeCollections = onSnapshot(collectionsQuery, (snapshot) => {
           const collectionsData = snapshot.docs.map(doc => doc.data() as Collection);
           setCollections(collectionsData);
           const totalCardCount = collectionsData.reduce((sum, coll) => sum + (coll.cardCount || 0), 0);
           setTotalCards(totalCardCount);
        }, (error) => console.error("Error fetching collections:", error));
        
        const categoriesQuery = query(collection(db, 'categories'));
        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
            if (snapshot.empty && user.isAdmin) {
                seedCategories();
            } else {
                const categoriesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Category);
                setCategories(categoriesData);
            }
        }, (error) => console.error("Error fetching categories:", error));

        setDataLoading(false);

        return () => {
            unsubscribeUsers();
            unsubscribeCollections();
            unsubscribeCategories();
        };
    }, [user, authLoading, router, seedCategories]);

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
    
    const handleAddCategory = async () => {
        if (!newCategoryName) {
            toast({ title: 'Error', description: 'Category name is required.', variant: 'destructive' });
            return;
        }
        setIsAddingCategory(true);
        const result = await addCategory({ name: newCategoryName, description: newCategoryDesc });
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            setIsAddCategoryOpen(false);
            setNewCategoryName('');
            setNewCategoryDesc('');
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setIsAddingCategory(false);
    };


    if (authLoading || dataLoading) {
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
    <>
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
            <Button size="sm" onClick={() => setIsAddCategoryOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No categories found.</TableCell>
                  </TableRow>
                ) : (
                  categories.map(category => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
    
    {/* Add Category Dialog */}
    <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Enter the details for the new category. The icon will be set to a default.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Sports Memorabilia"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-desc">Description</Label>
               <Input
                id="category-desc"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                placeholder="e.g., Jerseys, balls, cards, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddCategory} disabled={isAddingCategory}>
              {isAddingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
