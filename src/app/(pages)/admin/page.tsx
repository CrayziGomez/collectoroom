
import { createCategory, deleteCategory, updateCategory, getCategories, seedDefaultCategories } from '@/app/actions/category-actions';
import { getAdminStats, getAllUsers, setUserAdmin, adminDeleteUser } from '@/app/actions/admin-actions';
import { getSiteContent, updateSiteContent } from '@/app/actions/site-content';
import AdminPageClient from './AdminPageClient';

export default function AdminPage() {
  return (
    <AdminPageClient
      getAdminStatsAction={getAdminStats}
      getAllUsersAction={getAllUsers}
      setUserAdminAction={setUserAdmin}
      adminDeleteUserAction={adminDeleteUser}
      addCategoryAction={createCategory}
      deleteCategoryAction={deleteCategory}
      updateCategoryAction={updateCategory}
      getCategoriesAction={getCategories}
      getSiteContentAction={getSiteContent}
      updateSiteContentAction={updateSiteContent}
      seedDefaultCategoriesAction={seedDefaultCategories}
    />
  );
}
