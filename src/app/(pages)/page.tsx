
import { currentUser } from '@clerk/nextjs/server';
import { HomePageClientContent } from './HomePageClientContent';
import { getSiteContent } from '@/app/actions/site-content';
import { getCategories } from '@/app/actions/category-actions';

export default async function HomePage() {
  const user = await currentUser();
  const userId = user?.id;

  const siteContentResult = await getSiteContent();
  const categoriesResult = await getCategories(userId);

  const heroContent = siteContentResult.success ? siteContentResult.data : {};
  const howItWorksSteps = siteContentResult.success ? (siteContentResult.data?.howItWorksSteps || []) : [];
  const categories = categoriesResult.success ? categoriesResult.categories : [];

  return (
    <HomePageClientContent 
      initialContent={heroContent} 
      initialCategories={categories}
      initialHowItWorksSteps={howItWorksSteps}
      initialHeroContent={heroContent}
    />
  );
}
