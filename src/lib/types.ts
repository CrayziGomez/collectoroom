

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
  followerCount?: number;
  followingCount?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  createdAt?: any; // Can be a Firestore Timestamp or a string after serialization
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
  createdAt: any; // Can be a Firestore Timestamp or a string after serialization
}

export interface ImageRecord {
  url: string;
  path: string;
  hint: string;
}

export interface Card {
  id: string;
  collectionId: string;
  userId: string;
  title: string;
  description: string;
  images: ImageRecord[];
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
        [key:string]: number;
    };
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: any;
}

export interface HowItWorksStep {
  icon: string;
  title: string;
  description: string;
}

export interface SiteContent {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageHint?: string;
  howItWorksSteps?: HowItWorksStep[];
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: 'NEW_FOLLOWER' | 'NEW_COLLECTION';
  message: string;
  link: string;
  isRead: boolean;
  timestamp: any;
}
