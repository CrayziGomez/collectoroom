
import { ICONS } from '@/lib/constants';
import * as Lucide from 'lucide-react';

interface CategoryIconProps extends Lucide.LucideProps {
  categoryName: string;
}

export function CategoryIcon({ categoryName, ...props }: CategoryIconProps) {
  const iconName = categoryName as keyof typeof ICONS;
  const IconComponent = ICONS[iconName] || Lucide.Layers3;

  return <IconComponent {...props} />;
}
