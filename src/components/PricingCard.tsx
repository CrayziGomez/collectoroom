import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PricingTier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PricingCardProps {
  tier: PricingTier;
}

export function PricingCard({ tier }: PricingCardProps) {
  return (
    <Card className={cn('flex flex-col', tier.isPopular && 'border-primary ring-2 ring-primary')}>
      <CardHeader className="relative">
        {tier.isPopular && <Badge className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">Most Popular</Badge>}
        <CardTitle>{tier.name}</CardTitle>
        <CardDescription>{tier.description}</CardDescription>
        <div>
          <span className="text-4xl font-bold">{tier.price}</span>
          <span className="text-muted-foreground">{tier.priceSuffix}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-3">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="mr-2 mt-1 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          variant={tier.isPopular ? 'default' : 'outline'}
          disabled={tier.isComingSoon}
        >
          {tier.isComingSoon ? 'Coming Soon' : tier.cta}
        </Button>
      </CardFooter>
    </Card>
  );
}
