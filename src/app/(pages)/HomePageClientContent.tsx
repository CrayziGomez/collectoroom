
'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { PRICING_TIERS, HOW_IT_WORKS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryIcon } from '@/components/CategoryIcon';

// Main client component for the homepage
export function HomePageClientContent({ initialContent, initialCategories, initialHowItWorksSteps, initialHeroContent }) {
    const { user, loading } = useAuth();
    const [content, setContent] = useState(initialHeroContent);
    const [categories] = useState(initialCategories);
    const [activeStep, setActiveStep] = useState(0);

    const Section = ({ children, className }) => {
        const controls = useAnimation();
        const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });

        useEffect(() => {
            if (inView) {
                controls.start('visible');
            } else {
                controls.start('hidden');
            }
        }, [controls, inView]);

        return (
            <motion.div
                ref={ref}
                animate={controls}
                initial="hidden"
                variants={{
                    visible: { opacity: 1, y: 0 },
                    hidden: { opacity: 0, y: 50 },
                }}
                transition={{ duration: 0.6 }}
                className={className}
            >
                {children}
            </motion.div>
        );
    };
    
    return (
    <div className="bg-background text-foreground">
        {/* Hero Section — rendered immediately from server props, no auth gate */}
        <div className="text-center md:text-left">
            <div className="container mx-auto px-4 py-24">
                <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-12">
                    <div className="md:w-1/2 space-y-6">
                        <h1
                            className="text-4xl md:text-6xl font-bold font-headline leading-tight tracking-tighter"
                            dangerouslySetInnerHTML={{ __html: content?.title || '' }}
                        />
                        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto md:mx-0">
                            {content?.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                            {!loading && (
                                <Button asChild size="lg" className="font-bold text-lg">
                                    <Link href={user ? "/my-collectoroom" : "/signup"}>
                                        {user ? 'Go to My Collectoroom' : 'Get Started For Free'}
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center items-center">
                        {content?.heroImageUrl ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                <Image
                                    src={content.heroImageUrl}
                                    alt="Hero Image"
                                    width={550}
                                    height={400}
                                    className="rounded-xl shadow-2xl object-cover"
                                    priority
                                />
                            </motion.div>
                        ) : (
                            <div className="w-[550px] h-[400px] bg-muted rounded-xl shadow-lg flex items-center justify-center">
                                <p className="text-muted-foreground">Image coming soon</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        
        {/* Categories Section */}
        <Section className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-center mb-4">Discover public collections</h2>
                <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                    Discover public collections across a wide range of interests.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {categories.map((category) => (
                        <Link 
                            href={`/gallery?category=${category.name}`} 
                            key={category.id} 
                            className="group"
                        >
                            <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all duration-300 h-full hover:shadow-lg hover:border-primary hover:-translate-y-1">
                                <CategoryIcon 
                                    categoryName={category.name} 
                                    className="h-8 w-8 mb-4 text-muted-foreground transition-colors group-hover:text-primary"
                                />
                                <span className="font-semibold text-sm text-center">{category.name}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </Section>

        {/* How It Works Section */}
        <Section className="py-20">
           <div className="container mx-auto px-4 bg-muted/50 rounded-2xl py-20">
                <h2 className="text-4xl font-bold font-headline text-center mb-12">How It Works</h2>
                <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                    {/* Image on the left */}
                    <div className="md:w-1/2 relative h-96">
                        {HOW_IT_WORKS.map((step, index) => (
                             <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -50 }}
                                animate={activeStep === index ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                                transition={{ duration: 0.5 }}
                                className={`absolute w-full h-full ${activeStep === index ? 'z-10' : 'z-0'}`}
                            > 
                                <Image 
                                    src={step.image} 
                                    alt={step.title} 
                                    layout="fill" 
                                    objectFit="contain" 
                                    className="rounded-xl"
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Content on the right */}
                    <div className="md:w-1/2 space-y-8">
                        {HOW_IT_WORKS.map((step, index) => (
                            <div 
                                key={index} 
                                className={`p-6 rounded-lg cursor-pointer transition-all duration-300 ${activeStep === index ? 'bg-background shadow-lg' : 'hover:bg-background/50'}`}
                                onMouseEnter={() => setActiveStep(index)}
                            >
                                <div className="flex items-center gap-4 mb-2">
                                    <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${activeStep === index ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                                        {step.icon}
                                    </div>
                                    <h3 className="text-2xl font-semibold font-headline">{step.title}</h3>
                                </div>
                                <p className="text-muted-foreground ml-14">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Section>

        
        {/* Pricing Section */}
        <Section className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold font-headline text-center mb-4">Pricing</h2>
                 <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-12">Choose the plan that is right for you.</p>
                <div className="grid md:grid-cols-3 gap-8 items-stretch">
                    {PRICING_TIERS.map((tier) => (
                        <Card key={tier.name} className={`flex flex-col ${tier.isFeatured ? 'border-primary shadow-xl' : ''}`}>
                            {tier.isFeatured && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold">MOST POPULAR</Badge>
                            )}
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl font-bold font-headline">{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-8 flex flex-col">
                                 <div className="text-center">
                                    <span className="text-5xl font-bold">{tier.price}</span>
                                    <span className="text-muted-foreground">{tier.priceDetail}</span>
                                </div>
                                <ul className="space-y-3 text-muted-foreground">
                                    {tier.features.map((feature, i) => (
                                        <li key={i} className="flex items-start">
                                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex-grow" />
                                 <Button 
                                    asChild 
                                    className={`w-full font-bold text-lg mt-6 ${tier.isFeatured ? '' : 'bg-secondary text-secondary-foreground'}`}
                                    disabled={tier.isComingSoon}
                                >
                                    <Link href="/signup">
                                       {tier.isComingSoon ? 'Coming Soon' : 'Choose Plan'}
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </Section>

         {/* CTA Section */}
        <Section className="py-20">
            <div className="container mx-auto px-4 text-center">
                <div className="bg-primary text-primary-foreground rounded-2xl p-12 shadow-xl">
                    <h2 className="text-4xl font-bold font-headline mb-4">Ready to Showcase Your Collection?</h2>
                    <p className="text-xl opacity-80 max-w-3xl mx-auto mb-8">
                       Join a community of collectors and start digitizing your prized possessions today. It's free to get started.
                    </p>
                    <Button asChild size="lg" variant="secondary" className="font-bold text-lg">
                         <Link href={user ? "/my-collectoroom" : "/signup"}>
                            {user ? 'Back to My Collectoroom' : 'Sign Up Now'}
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </Section>
    </div>
    );
}
