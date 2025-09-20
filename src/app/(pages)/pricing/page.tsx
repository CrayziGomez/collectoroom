import { PricingCard } from '@/components/PricingCard';
import { PRICING_TIERS } from '@/lib/constants';

export default function PricingPage() {
  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-headline">Find the Perfect Plan</h1>
        <p className="text-lg text-muted-foreground mt-2">Start for free and scale as your collection grows. No credit card required.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8 max-w-6xl mx-auto items-start">
        {PRICING_TIERS.map(tier => (
          <PricingCard key={tier.name} tier={tier} />
        ))}
      </div>
    </div>
  );
}
