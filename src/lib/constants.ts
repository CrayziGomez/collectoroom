import type { Category, PricingTier, Collection, User, Card } from '@/lib/types';
import {
  Palette,
  BookOpen,
  CircleDollarSign,
  Ticket,
  Shirt,
  UtensilsCrossed,
  Landmark,
  Music,
  Leaf,
  Star,
  Mail,
  Laptop,
  ToyBrick,
  Plane,
  Car,
  Clock,
} from 'lucide-react';

export const CATEGORIES: Category[] = [
  { id: 'art', name: 'Art', icon: Palette, description: 'Paintings, sculptures, photography etc' },
  { id: 'books', name: 'Books & Magazines', icon: BookOpen, description: '' },
  { id: 'coins', name: 'Coins & Banknotes', icon: CircleDollarSign, description: '' },
  { id: 'ephemera', name: 'Ephemera', icon: Ticket, description: 'Flyers, Tickets, Stickers, etc' },
  { id: 'fashion', name: 'Fashion', icon: Shirt, description: 'Clothes, Hats, Bags, Accessories etc' },
  { id: 'food', name: 'Food & Beverage', icon: UtensilsCrossed, description: 'Bottles, Tins, Caps, Coasters etc' },
  { id: 'history', name: 'Historic Memorabilia', icon: Landmark, description: '' },
  { id: 'music', name: 'Music', icon: Music, description: 'Records, Cassettes, Instruments, etc' },
  { id: 'nature', name: 'Nature', icon: Leaf, description: 'Rocks, Fossils, Shells, Plants etc' },
  { id: 'pop_culture', name: 'Pop Culture', icon: Star, description: 'Tickets, Autographs, Posters etc' },
  { id: 'stamps', name: 'Stamps', icon: Mail, description: '' },
  { id: 'technology', name: 'Technology', icon: Laptop, description: 'Electronics, Gadgets, Manuals, etc' },
  { id: 'toys', name: 'Toys & Games', icon: ToyBrick, description: '' },
  { id: 'travel', name: 'Travel Souvenirs', icon: Plane, description: '' },
  { id: 'vehicles', name: 'Vehicles', icon: Car, description: 'Cars, Motorcycles, Boats etc' },
  { id: 'watches', name: 'Watches & Clocks', icon: Clock, description: '' },
];

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Hobbyist',
    price: '€0',
    priceSuffix: 'forever',
    description: 'Perfect for casual collectors getting started',
    features: ['Up to 50 digital cards', '2 Collections', 'Public collections only', 'Collection/Card sharing', 'Community access', 'Support'],
    isPopular: false,
    isComingSoon: false,
    cta: 'Get Started Free',
  },
  {
    name: 'Explorer',
    price: '€3',
    priceSuffix: '/month',
    description: 'Great for growing collections with privacy options',
    features: ['Up to 300 digital cards', 'Up to 10 Collections', 'Public/Private Collections', 'Advanced search', 'Collection/Card sharing', 'Community access', 'Priority support'],
    isPopular: false,
    isComingSoon: false,
    cta: 'Choose Explorer',
  },
  {
    name: 'Collector',
    price: '€5',
    priceSuffix: '/month',
    description: 'For serious collectors with extensive catalogs',
    features: ['Up to 600 digital cards', 'Up to 30 collections', 'Public/Private Collections', 'Advanced search', 'Bulk upload tools', 'Community access', 'Premium support'],
    isPopular: true,
    isComingSoon: false,
    cta: 'Choose Collector',
  },
  {
    name: 'Curator',
    price: 'Variable',
    priceSuffix: 'cost depending on your needs',
    description: 'Ultimate plan for professional collectors and dealers',
    features: ['Up to 1000 digital cards', 'Up to 300 collections', 'Public/Private viewing function', 'Advanced search', 'Bulk upload tools', 'Community access', 'Dedicated support'],
    isPopular: false,
    isComingSoon: false,
    cta: 'Contact Us',
  },
];

export const MOCK_USERS: User[] = [
    { id: '1', email: 'user@collectoroom.com', username: 'JaneDoe', avatarUrl: 'https://picsum.photos/seed/avatar1/100/100', country: 'DE', tier: 'Collector', isAdmin: true },
    { id: '2', email: 'admin@collectoroom.com', username: 'AdminUser', avatarUrl: 'https://picsum.photos/seed/avatar2/100/100', country: 'US', tier: 'Curator', isAdmin: true },
    { id: '3', email: 'explorer@collectoroom.com', username: 'JohnSmith', avatarUrl: 'https://picsum.photos/seed/avatar3/100/100', country: 'GB', tier: 'Explorer', isAdmin: false },
    { id: '4', email: 'hobbyist@collectoroom.com', username: 'ArtFriend', avatarUrl: 'https://picsum.photos/seed/avatar4/100/100', country: 'FR', tier: 'Hobbyist', isAdmin: false },
]

export const MOCK_COLLECTIONS: Collection[] = [
  { id: '1', userId: '1', name: 'Vintage Stamps of Europe', description: 'A collection of rare stamps from various European countries from the early 20th century.', isPublic: true, category: 'Stamps', cardCount: 5, coverImage: 'https://picsum.photos/seed/stamp/400/300', coverImageHint: 'stamp collection' },
  { id: '2', userId: '4', name: 'Classic Rock Vinyls', description: 'Legendary albums from the golden age of rock music.', isPublic: true, category: 'Music', cardCount: 3, coverImage: 'https://picsum.photos/seed/vinyl/400/300', coverImageHint: 'vinyl records' },
  { id: '3', userId: '1', name: 'Roman Empire Denarii', description: 'Silver coins from the time of the Roman emperors.', isPublic: false, category: 'Coins & Banknotes', cardCount: 4, coverImage: 'https://picsum.photos/seed/coins/400/300', coverImageHint: 'rare coins' },
  { id: '4', userId: '3', name: 'Matchbox Car Collection', description: 'A vibrant collection of Matchbox cars from the 1970s and 80s.', isPublic: true, category: 'Toys & Games', cardCount: 2, coverImage: 'https://picsum.photos/seed/toycars/400/300', coverImageHint: 'toy cars' },
  { id: '5', userId: '2', name: 'Private Art Sketches', description: 'A private collection of sketches from local artists.', isPublic: false, category: 'Art', cardCount: 1, coverImage: 'https://picsum.photos/seed/sketches/400/300', coverImageHint: 'art sketch' },
  { id: '6', userId: '1', name: 'Seashells from Around the World', description: 'A personal collection of unique seashells gathered from beaches globally.', isPublic: true, category: 'Nature', cardCount: 2, coverImage: 'https://picsum.photos/seed/shells/400/300', coverImageHint: 'sea shells' },
];

export const MOCK_CARDS: Card[] = [
    { id: 'c1-1', collectionId: '1', title: 'Penny Black', description: 'The first adhesive postage stamp.', imageUrl: 'https://picsum.photos/seed/card-stamp1/300/400', imageHint: 'old stamp', category: 'Stamps', status: 'Display only' },
    { id: 'c1-2', collectionId: '1', title: 'Swedish Treskilling Yellow', description: 'A rare and valuable Swedish stamp.', imageUrl: 'https://picsum.photos/seed/card-stamp2/300/400', imageHint: 'yellow stamp', category: 'Stamps', status: 'Display only' },
    { id: 'c1-3', collectionId: '1', title: 'British Guiana 1c Magenta', description: 'Considered the world\'s most famous rare stamp.', imageUrl: 'https://picsum.photos/seed/card-stamp3/300/400', imageHint: 'magenta stamp', category: 'Stamps', status: 'For sale' },
    { id: 'c1-4', collectionId: '1', title: 'Inverted Jenny', description: 'A famous US stamp with a printing error.', imageUrl: 'https://picsum.photos/seed/card-stamp4/300/400', imageHint: 'airplane stamp', category: 'Stamps', status: 'Wish list' },
    { id: 'c1-5', collectionId: '1', title: 'Mauritius "Post Office"', description: 'Issued in Mauritius in September 1847.', imageUrl: 'https://picsum.photos/seed/card-stamp5/300/400', imageHint: 'orange stamp', category: 'Stamps', status: 'Display only' },
    
    { id: 'c2-1', collectionId: '2', title: 'Led Zeppelin - IV', description: 'The untitled fourth studio album.', imageUrl: 'https://picsum.photos/seed/card-vinyl1/300/400', imageHint: 'album cover', category: 'Music', status: 'Display only' },
    { id: 'c2-2', collectionId: '2', title: 'Pink Floyd - The Dark Side of the Moon', description: 'A classic concept album.', imageUrl: 'https://picsum.photos/seed/card-vinyl2/300/400', imageHint: 'prism album', category: 'Music', status: 'Display only' },
    { id: 'c2-3', collectionId: '2', title: 'The Beatles - Abbey Road', description: 'The final Beatles album recorded.', imageUrl: 'https://picsum.photos/seed/card-vinyl3/300/400', imageHint: 'band walking', category: 'Music', status: 'Previously owned' },
    
    { id: 'c3-1', collectionId: '3', title: 'Denarius of Augustus', description: 'From the reign of the first Roman Emperor.', imageUrl: 'https://picsum.photos/seed/card-coin1/300/400', imageHint: 'silver coin', category: 'Coins & Banknotes', status: 'Display only' },
    { id: 'c3-2', collectionId: '3', title: 'Denarius of Tiberius', description: 'The "Tribute Penny" of the Bible.', imageUrl: 'https://picsum.photos/seed/card-coin2/300/400', imageHint: 'roman coin', category: 'Coins & Banknotes', status: 'Display only' },
    { id: 'c3-3', collectionId: '3', title: 'Denarius of Trajan', description: 'Representing one of the Five Good Emperors.', imageUrl: 'https://picsum.photos/seed/card-coin3/300/400', imageHint: 'emperor coin', category: 'Coins & Banknotes', status: 'For rent' },
    { id: 'c3-4', collectionId: '3', title: 'Denarius of Hadrian', description: 'Known for his extensive building projects.', imageUrl: 'https://picsum.photos/seed/card-coin4/300/400', imageHint: 'ancient coin', category: 'Coins & Banknotes', status: 'For sale' },
    
    { id: 'c4-1', collectionId: '4', title: '1972 Red Fire Engine', description: 'A classic red Matchbox fire engine.', imageUrl: 'https://picsum.photos/seed/card-toycar1/300/400', imageHint: 'red toy car', category: 'Toys & Games', status: 'Display only' },
    { id: 'c4-2', collectionId: '4', title: '1980 Porsche 911 Turbo', description: 'A sleek silver model.', imageUrl: 'https://picsum.photos/seed/card-toycar2/300/400', imageHint: 'silver toy car', category: 'Toys & Games', status: 'Display only' },

    { id: 'c5-1', collectionId: '5', title: 'Charcoal Portrait Study', description: 'A quick sketch of a face.', imageUrl: 'https://picsum.photos/seed/card-sketch1/300/400', imageHint: 'charcoal sketch', category: 'Art', status: 'Display only' },

    { id: 'c6-1', collectionId: '6', title: 'Conch Shell', description: 'From the beaches of the Caribbean.', imageUrl: 'https://picsum.photos/seed/card-shell1/300/400', imageHint: 'conch shell', category: 'Nature', status: 'Display only' },
    { id: 'c6-2', collectionId: '6', title: 'Sand Dollar', description: 'Found on the Pacific coast.', imageUrl: 'https://picsum.photos/seed/card-shell2/300/400', imageHint: 'sand dollar', category: 'Nature', status: 'Display only' },
];

export const CARD_STATUSES: Card['status'][] = ['Display only', 'For sale', 'For rent', 'Previously owned', 'Wish list'];
