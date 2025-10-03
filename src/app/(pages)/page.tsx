
import { HomePageClientContent } from './HomePageClientContent';
import { getSiteContent } from '@/app/actions/site-content';
import { getCategories } from '@/app/actions/category-actions'; // Ensure this path is correct

// This is now a Server Component that fetches data and passes it to a Client Component.
export default async function HomePage() {
  // Fetch data on the server
  const content = await getSiteContent({ pageId: 'homePage' });
  const categories = await getCategories();

  // Default values are handled inside the getSiteContent action
  const heroContent = content;
  const howItWorksSteps = content.howItWorksSteps || [];

  return (
    <HomePageClientContent 
      initialContent={content} 
      initialCategories={categories}
      initialHowItWorksSteps={howItWorksSteps}
      initialHeroContent={heroContent}
    />
  );
}
