
import type { LucideIcon } from 'lucide-react';

export interface User {
  id: string;
  uid: string;
  email: string;
  username: string;
  avatarUrl?: string;
  country?: string;
  tier: 'Hobbyist' | 'Explorer' | 'Collector' | 'Curator';
  isAdmin: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

export interface PricingTier {
  name: 'Hobbyist' | 'Explorer' | 'Collector' | 'Curator';
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  isPopular: boolean;
  isComingSoon: boolean;
  cta: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  category: string;
  cardCount: number;
  coverImage: string;
  coverImageHint: string;
  keywords?: string;
}

export interface Card {
  id: string;
  collectionId: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  category: string;
  status: 'Display only' | 'For sale' | 'For rent' | 'Previously owned' | 'Wish list' | '';
}
