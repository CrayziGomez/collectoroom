
import {
  createCategory, // Corrected from addCategory
  deleteCategory,
} from '@/app/actions/category-actions';
import { deleteUser } from '@/app/actions/user-actions';
import { getSiteContent, updateSiteContent } from '@/app/actions/site-content';
import AdminPageClient from './AdminPageClient'; // Corrected import

// This is the new SERVER component for the Admin Page.
export default function AdminPage() {
  // This component now safely handles importing server actions.
  // It then passes these actions as props to the client component.
  // This is the correct pattern for using server actions in client components.
  return (
    <AdminPageClient
      addCategoryAction={createCategory} // Corrected prop assignment
      deleteCategoryAction={deleteCategory}
      deleteUserAction={deleteUser}
      getSiteContentAction={getSiteContent}
      updateSiteContentAction={updateSiteContent}
    />
  );
}
