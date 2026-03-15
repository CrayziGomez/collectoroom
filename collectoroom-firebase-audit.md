# Collectoroom Firebase Audit Report

**Generated:** 2026-03-12
**Repository:** https://github.com/CrayziGomez/collectoroom
**Framework:** Next.js 15 with App Router + Turbopack

---

## Executive Summary

| Category | Status | Migration Complexity |
|----------|--------|---------------------|
| **Authentication** | Already on Clerk | None required |
| **Database (Firestore)** | Active use | Medium |
| **Storage** | Active use | Medium |
| **Hosting** | Firebase App Hosting config present | Low |

**Good News:** Auth is already migrated to Clerk - this significantly reduces migration scope!

---

## SECURITY ALERT

**`.env-BAK.local` contains exposed credentials in public repo!**

Exposed secrets include:
- Firebase API keys
- Full Firebase service account private key (base64 encoded)

**Immediate Action Required:**
1. Rotate all Firebase credentials in Firebase Console
2. Remove `.env-BAK.local` from git history
3. Add `.env*` patterns to `.gitignore`

---

## Firebase Dependencies

### package.json

```json
{
  "firebase": "^12.3.0",           // Client SDK - TO REMOVE
  "firebase-admin": "^13.5.0",     // Server SDK - TO REMOVE
  "@google-cloud/storage": "^7.11.0", // GCS - TO REMOVE
  "@clerk/nextjs": "^6.33.3"       // Auth - KEEP (already migrated!)
}
```

---

## Firebase Usage Map

### 1. Configuration Files (TO DELETE)

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Client-side Firebase init |
| `src/lib/firebase-admin.ts` | Server-side Firebase Admin init |
| `firebase.json` | Firebase hosting config |
| `firestore.rules` | Firestore security rules |
| `storage.rules` | Storage security rules |
| `.firebaserc` | Firebase project config |
| `apphosting.yaml` | Firebase App Hosting config |
| `.firebase/` | Firebase cache directory |

### 2. Server Actions Using Firebase

| File | Firebase Services | Operations |
|------|------------------|------------|
| `src/app/actions/collection-actions.ts` | Firestore | Create collection, transactions |
| `src/app/actions/card-actions.ts` | Firestore + Storage | CRUD cards, image upload/delete |
| `src/app/actions/user-actions.ts` | Firestore | User profile data (merged with Clerk) |
| `src/app/actions/admin-actions.ts` | Firestore | Admin role management |
| `src/app/actions/category-actions.ts` | Firestore | CRUD categories |
| `src/app/actions/site-content.ts` | Firestore + Storage | CMS content, hero images |
| `src/app/actions/storage-test.ts` | Storage | Test utility |

### 3. Firestore Collections

| Collection | Fields | Related Actions |
|------------|--------|-----------------|
| `users` | id, planId, cardCount, collectionCount, isAdmin, followingCount, followersCount | user-actions.ts |
| `users/{id}/following` | followedAt | user-actions.ts (subcollection) |
| `users/{id}/followers` | followedAt | user-actions.ts (subcollection) |
| `collections` | name, userId, category, cardCount, coverImage, createdAt | collection-actions.ts |
| `cards` | title, description, status, category, images[], userId, collectionId, createdAt | card-actions.ts |
| `categories` | name, description, icon, createdAt | category-actions.ts |
| `siteContent` | title, subtitle, heroImageUrl, heroImagePath, howItWorksSteps[] | site-content.ts |

### 4. Storage Paths

| Path Pattern | Purpose |
|--------------|---------|
| `users/{userId}/cards/{cardId}/{filename}` | Card images |
| `site-content/hero/{filename}` | CMS hero images |

---

## Data Types (for PostgreSQL Schema Design)

```typescript
// From src/lib/types.ts

interface User {
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

interface Collection {
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
  createdAt: any;
}

interface Card {
  id: string;
  collectionId: string;
  userId: string;
  title: string;
  description: string;
  images: ImageRecord[];
  category: string;
  status: 'Display only' | 'For sale' | 'For rent' | 'Previously owned' | 'Wish list' | '';
}

interface ImageRecord {
  url: string;
  path: string;
  hint: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  createdAt?: string;
}

interface Chat {
  id: string;
  participantIds: string[];
  participants: { [key: string]: Pick<User, 'username' | 'avatarUrl'> };
  lastMessage?: { text: string; timestamp: any; };
  unreadCount?: { [key:string]: number; };
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: any;
}

interface Notification {
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
```

---

## Migration Effort Estimate

### Files to Modify

| File | Changes Required | Effort |
|------|-----------------|--------|
| `src/lib/firebase.ts` | DELETE | - |
| `src/lib/firebase-admin.ts` | REPLACE with PostgreSQL + S3 clients | Medium |
| `src/app/actions/collection-actions.ts` | Replace Firestore calls with PostgreSQL | Medium |
| `src/app/actions/card-actions.ts` | Replace Firestore + Storage calls | High |
| `src/app/actions/user-actions.ts` | Replace Firestore calls (keep Clerk) | Medium |
| `src/app/actions/admin-actions.ts` | Replace Firestore calls | Low |
| `src/app/actions/category-actions.ts` | Replace Firestore calls | Low |
| `src/app/actions/site-content.ts` | Replace Firestore + Storage calls | Medium |
| `src/app/actions/storage-test.ts` | DELETE or update for S3 | Low |

### Recommended Approach

1. **Create abstraction layer** - Database service + Storage service interfaces
2. **PostgreSQL schema** - Map Firestore collections to tables
3. **S3 wrapper** - Replace Firebase Storage with S3-compatible client
4. **Migrate actions one by one** - Test after each migration
5. **Remove Firebase dependencies** - Clean up package.json

---

## Proposed PostgreSQL Schema

```sql
-- Users (extends Clerk data)
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY, -- Clerk user ID
  plan_id VARCHAR(50) DEFAULT 'free',
  card_count INTEGER DEFAULT 0,
  collection_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  following_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User follows (replaces subcollections)
CREATE TABLE user_follows (
  follower_id VARCHAR(255) REFERENCES users(id),
  following_id VARCHAR(255) REFERENCES users(id),
  followed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100) DEFAULT 'Layers3',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  category_id UUID REFERENCES categories(id),
  card_count INTEGER DEFAULT 0,
  cover_image TEXT,
  cover_image_hint TEXT,
  keywords TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  user_id VARCHAR(255) REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Card images (replaces images[] array)
CREATE TABLE card_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  hint TEXT,
  position INTEGER DEFAULT 0
);

-- Site content (single row for CMS)
CREATE TABLE site_content (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'content',
  title TEXT,
  subtitle TEXT,
  hero_image_url TEXT,
  hero_image_path TEXT,
  how_it_works_steps JSONB
);

-- Chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids VARCHAR(255)[] NOT NULL,
  participants JSONB,
  last_message JSONB,
  unread_count JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id VARCHAR(255) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_cards_collection ON cards(collection_id);
CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
```

---

## Next Steps

1. **Rotate exposed credentials immediately**
2. **Create migration branch** in git
3. **Set up local Docker environment** (PostgreSQL + MinIO)
4. **Implement database abstraction layer**
5. **Migrate server actions one file at a time**
6. **Test thoroughly before removing Firebase deps**
7. **Clean up Firebase config files**

---

*Report generated by MiniMax Agent*
