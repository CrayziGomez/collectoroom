import { CATEGORIES } from '@/lib/constants';
import { Layers3, type LucideProps } from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  categoryName: string;
}

export function CategoryIcon({ categoryName, ...props }: CategoryIconProps) {
  const category = CATEGORIES.find(c => c.name === categoryName);
  const IconComponent = category ? category.icon : Layers3;

  return <IconComponent {...props} />;
}
