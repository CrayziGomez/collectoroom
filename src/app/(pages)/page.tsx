
import { HomePageClientContent } from './HomePageClientContent';
import { getSiteContent } from '@/app/actions/site-content';
import { getCategories } from '@/app/actions/category-actions';
import { auth } from '@/lib/firebase/client'; // Corrected import path

// This is a Server Component that fetches data and passes it to a Client Component.
export default async function HomePage() {
  // Fetch site-wide content. The function takes no arguments.
  const siteContentResult = await getSiteContent();

  // The getCategories action requires a user ID. 
  // On the public homepage, we might not have a logged-in user.
  // We will conditionally fetch categories only if a user is available.
  // NOTE: This assumes you want to show user-specific categories on the homepage.
  // If categories are public, the getCategories action needs to be changed.
  let categoriesResult = { success: true, categories: [] };
  const user = auth.currentUser; // This might be null on the server.
  if (user) {
    categoriesResult = await getCategories(user.uid);
  }

  // Safely extract data, providing sensible defaults.
  const heroContent = siteContentResult.success ? siteContentResult.data : {};
  const howItWorksSteps = siteContentResult.success ? (siteContentResult.data?.howItWorksSteps || []) : [];
  const categories = categoriesResult.success ? categoriesResult.categories : [];

  return (
    <HomePageClientContent 
      initialContent={heroContent} 
      initialCategories={categories}
      initialHowItWorksSteps={howItWorksSteps}
      initialHeroContent={heroContent} // Passing this again, as the original code did.
    />
  );
}
