
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
  cardStatuses?: string[];
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

export interface Chat {
    id: string;
    participantIds: string[];
    participants: { [key: string]: Pick<User, 'username' | 'avatarUrl'> };
    lastMessage?: {
        text: string;
        timestamp: any;
    };
    unreadCount?: {
        [key: string]: number;
    };
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: any;
}
