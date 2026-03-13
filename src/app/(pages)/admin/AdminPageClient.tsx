'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useToast } from '@/hooks/use-toast';
import { Users, LayoutGrid, Tag, FileText, Trash2, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import Spinner from '@/components/ui/spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  isAdmin: boolean;
  cardCount: number;
  collectionCount: number;
  createdAt: number;
}

interface AdminStats {
  userCount: number;
  collectionCount: number;
  cardCount: number;
  categoryCount: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface SiteContentData {
  id: string;
  title: string | null;
  subtitle: string | null;
  hero_image_url: string | null;
  hero_image_path: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminPageClientProps {
  getAdminStatsAction: () => Promise<any>;
  getAllUsersAction: () => Promise<any>;
  setUserAdminAction: (userId: string, isAdmin: boolean) => Promise<any>;
  adminDeleteUserAction: (userId: string) => Promise<any>;
  addCategoryAction: (formData: FormData) => Promise<any>;
  deleteCategoryAction: (formData: FormData) => Promise<any>;
  updateCategoryAction: (formData: FormData) => Promise<any>;
  getCategoriesAction: () => Promise<any>;
  getSiteContentAction: () => Promise<any>;
  updateSiteContentAction: (formData: FormData) => Promise<any>;
  seedDefaultCategoriesAction: () => Promise<any>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: number | undefined; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminPageClient = ({
  getAdminStatsAction,
  getAllUsersAction,
  setUserAdminAction,
  adminDeleteUserAction,
  addCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  getCategoriesAction,
  getSiteContentAction,
  updateSiteContentAction,
  seedDefaultCategoriesAction,
}: AdminPageClientProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data
  const [stats, setStats] = useState<AdminStats | undefined>(undefined);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContentData | null>(null);

  // Loading
  const [usersLoading, setUsersLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, loading, router]);

  // ─── Load initial data ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.isAdmin) return;

    getAdminStatsAction().then(res => {
      if (res.success) setStats(res.data);
    });

    getCategoriesAction().then(res => {
      if (res.success) setCategories(res.categories || []);
      setCategoriesLoading(false);
    });

    getSiteContentAction().then(res => {
      if (res.success) setSiteContent(res.data);
    });
  }, [user?.isAdmin]);

  function loadUsers() {
    if (users.length > 0) return; // already loaded
    setUsersLoading(true);
    getAllUsersAction().then(res => {
      if (res.success) setUsers(res.users || []);
      setUsersLoading(false);
    });
  }

  // ─── User actions ─────────────────────────────────────────────────────────────

  function handleToggleAdmin(userId: string, currentIsAdmin: boolean) {
    startTransition(async () => {
      const res = await setUserAdminAction(userId, !currentIsAdmin);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u));
        toast({ title: `Admin ${currentIsAdmin ? 'revoked' : 'granted'}` });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    });
  }

  function handleDeleteUser(userId: string, username: string) {
    startTransition(async () => {
      const res = await adminDeleteUserAction(userId);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        toast({ title: `User "${username}" deleted` });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    });
  }

  // ─── Category actions ─────────────────────────────────────────────────────────

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const formData = new FormData();
    formData.set('name', newCategoryName.trim());
    formData.set('description', newCategoryDesc.trim());
    startTransition(async () => {
      const res = await addCategoryAction(formData);
      if (res.success) {
        setNewCategoryName('');
        setNewCategoryDesc('');
        const updated = await getCategoriesAction();
        if (updated.success) setCategories(updated.categories || []);
        toast({ title: 'Category created' });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    });
  }

  function handleUpdateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;
    const formData = new FormData();
    formData.set('categoryId', editingCategory.id);
    formData.set('name', editingCategory.name);
    startTransition(async () => {
      const res = await updateCategoryAction(formData);
      if (res.success) {
        setEditingCategory(null);
        const updated = await getCategoriesAction();
        if (updated.success) setCategories(updated.categories || []);
        toast({ title: 'Category updated' });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    });
  }

  function handleDeleteCategory(categoryId: string, categoryName: string) {
    const formData = new FormData();
    formData.set('categoryId', categoryId);
    startTransition(async () => {
      const res = await deleteCategoryAction(formData);
      if (res.success) {
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        toast({ title: `Category "${categoryName}" deleted` });
      } else {
        toast({ title: 'Cannot delete', description: res.message, variant: 'destructive' });
      }
    });
  }

  // ─── Seed categories ──────────────────────────────────────────────────────────

  function handleSeedCategories() {
    startTransition(async () => {
      const res = await seedDefaultCategoriesAction();
      if (res.success) {
        const updated = await getCategoriesAction();
        if (updated.success) setCategories(updated.categories || []);
        toast({ title: res.inserted > 0 ? `Seeded ${res.inserted} default categories` : res.message });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    });
  }

  // ─── Site content ─────────────────────────────────────────────────────────────

  function handleUpdateSiteContent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (siteContent?.hero_image_url) formData.set('heroImageUrl', siteContent.hero_image_url);
    if (siteContent?.hero_image_path) formData.set('existingHeroImagePath', siteContent.hero_image_path);
    startTransition(async () => {
      const res = await updateSiteContentAction(formData);
      if (res.success) {
        if (res.data) setSiteContent(res.data);
        toast({ title: 'Site content updated' });
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    });
  }

  // ─── Loading / guard ──────────────────────────────────────────────────────────

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Spinner />
        <p className="text-sm text-muted-foreground">Loading admin session…</p>
      </div>
    );
  }

  if (!user.isAdmin) return null;

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user.username}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users" onClick={loadUsers}>Users</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="site-content">Site Content</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats?.userCount} icon={Users} />
            <StatCard label="Collections" value={stats?.collectionCount} icon={LayoutGrid} />
            <StatCard label="Cards" value={stats?.cardCount} icon={FileText} />
            <StatCard label="Categories" value={stats?.categoryCount} icon={Tag} />
          </div>
        </TabsContent>

        {/* ── Users ────────────────────────────────────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Grant or revoke admin privileges and delete accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : users.length === 0 ? (
                <Alert><AlertDescription>No users found. Click the Users tab to load.</AlertDescription></Alert>
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={u.avatarUrl} alt={u.username} />
                          <AvatarFallback>{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{u.username}</span>
                            {u.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.collectionCount} collections · {u.cardCount} cards
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending || u.id === user.id}
                          onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                          title={u.isAdmin ? 'Revoke admin' : 'Grant admin'}
                        >
                          {u.isAdmin
                            ? <ShieldOff className="h-4 w-4" />
                            : <ShieldCheck className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending || u.id === user.id}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{u.username}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{u.email}</strong> and all their data from Clerk and the database. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Categories ───────────────────────────────────────────────────── */}
        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</CardTitle>
              </CardHeader>
              <CardContent>
                {editingCategory ? (
                  <form onSubmit={handleUpdateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-cat-name">Name</Label>
                      <Input
                        id="edit-cat-name"
                        value={editingCategory.name}
                        onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Name</Label>
                      <Input
                        id="cat-name"
                        placeholder="e.g. Stamps"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-desc">Description</Label>
                      <Input
                        id="cat-desc"
                        placeholder="Short description…"
                        value={newCategoryDesc}
                        onChange={e => setNewCategoryDesc(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Category
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Existing Categories</CardTitle>
                    <CardDescription>{categories.length} total</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSeedCategories} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Seed Defaults
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : categories.length === 0 ? (
                  <Alert><AlertDescription>No categories yet. Add one to get started.</AlertDescription></Alert>
                ) : (
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => setEditingCategory(cat)}>
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Collections using this category must be reassigned first. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Site Content ─────────────────────────────────────────────────── */}
        <TabsContent value="site-content">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Content</CardTitle>
              <CardDescription>Update the hero section displayed on the homepage.</CardDescription>
            </CardHeader>
            <CardContent>
              {!siteContent ? (
                <div className="space-y-3 max-w-lg">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={handleUpdateSiteContent} className="space-y-5 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="sc-title">Hero Title</Label>
                    <Input
                      id="sc-title"
                      name="title"
                      defaultValue={siteContent.title || ''}
                      placeholder="Welcome to CollectoRoom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sc-subtitle">Hero Subtitle</Label>
                    <Input
                      id="sc-subtitle"
                      name="subtitle"
                      defaultValue={siteContent.subtitle || ''}
                      placeholder="Create, manage, and share your collections…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sc-image">Hero Image</Label>
                    {siteContent.hero_image_url && (
                      <p className="text-xs text-muted-foreground truncate">
                        Current: {siteContent.hero_image_url}
                      </p>
                    )}
                    <Input id="sc-image" name="heroImage" type="file" accept="image/*" />
                  </div>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPageClient;
