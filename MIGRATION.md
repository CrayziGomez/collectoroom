# Firebase to PostgreSQL + S3 Migration Guide

## Overview

This guide walks through migrating Collectoroom from Firebase (Firestore + Cloud Storage) to a self-hosted stack (PostgreSQL + S3-compatible storage).

**Auth stays on Clerk** - we're only migrating database and file storage.

---

## Quick Start

### 1. Start Local Services

```bash
# Start PostgreSQL and MinIO
npm run db:up

# View logs
npm run db:logs

# Check services are running
docker ps
```

**Services:**
- PostgreSQL: `localhost:5432`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001` (login: minioadmin/minioadmin123)

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit with your Clerk keys (keep existing)
# The database/storage vars are pre-configured for local dev
```

### 3. Install New Dependencies

```bash
npm install
```

---

## Migration Phases

### Phase 1: Infrastructure Setup (DONE)

- [x] Docker Compose for PostgreSQL + MinIO
- [x] PostgreSQL schema (`db/init.sql`)
- [x] Database service layer (`src/lib/db.ts`)
- [x] Storage service layer (`src/lib/storage.ts`)
- [x] Environment template (`.env.local.example`)

### Phase 2: Action Files Migration

Migrate each action file from Firebase to PostgreSQL/S3:

| File | Status | Notes |
|------|--------|-------|
| `category-actions.ts` | TODO | Simplest - start here |
| `admin-actions.ts` | TODO | Single function |
| `collection-actions.ts` | TODO | Uses transactions |
| `user-actions.ts` | TODO | Integrates with Clerk |
| `card-actions.ts` | TODO | Most complex - storage + DB |
| `site-content.ts` | TODO | Storage + DB |

### Phase 3: Cleanup

- [ ] Remove Firebase config files
- [ ] Remove Firebase from package.json
- [ ] Update .gitignore
- [ ] Test all functionality

---

## File-by-File Migration Examples

### Example: category-actions.ts

**Before (Firebase):**
```typescript
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function createCategory(formData: FormData) {
  const categoryRef = adminDb.collection('categories').doc();
  await categoryRef.set({
    name,
    description,
    icon: 'Layers3',
    createdAt: FieldValue.serverTimestamp(),
  });
  return { success: true, categoryId: categoryRef.id };
}
```

**After (PostgreSQL):**
```typescript
import { query, queryOne } from '@/lib/db';

export async function createCategory(formData: FormData) {
  const result = await queryOne<{ id: string }>(
    `INSERT INTO categories (name, description, icon)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [name, description || '', 'Layers3']
  );
  return { success: true, categoryId: result?.id };
}
```

### Example: card-actions.ts (with Storage)

**Before (Firebase):**
```typescript
import { adminDb, adminStorage } from '@/lib/firebase-admin';

async function uploadImage(file: File, userId: string, cardId: string) {
  const bucket = adminStorage.bucket();
  const imagePath = `users/${userId}/cards/${cardId}/${filename}`;
  const fileRef = bucket.file(imagePath);
  await fileRef.save(buffer);
  const [signedUrl] = await fileRef.getSignedUrl({ ... });
  return { url: signedUrl, path: imagePath };
}
```

**After (S3):**
```typescript
import { uploadCardImage } from '@/lib/storage';
import { query } from '@/lib/db';

async function uploadImage(file: File, userId: string, collectionId: string, cardId: string) {
  return uploadCardImage(file, userId, collectionId, cardId);
}
```

---

## Database Schema Reference

See `db/init.sql` for the complete schema. Key tables:

- `users` - Extends Clerk user data
- `user_follows` - Replaces Firestore subcollections
- `categories` - Global categories
- `collections` - User collections
- `cards` - Collection items
- `card_images` - Card images (replaces images[] array)
- `site_content` - CMS content
- `chats` / `messages` - Chat functionality
- `notifications` - User notifications

---

## Storage Paths

Same structure as Firebase, works with any S3-compatible service:

```
collectoroom/
├── users/
│   └── {userId}/
│       └── cards/
│           └── {cardId}/
│               └── {uuid}.{ext}
└── site-content/
    └── hero/
        └── {uuid}.{ext}
```

---

## Testing the Migration

1. Start services: `npm run db:up`
2. Run the app: `npm run dev`
3. Test each feature as you migrate it
4. Check MinIO console for uploaded files
5. Query PostgreSQL to verify data

```bash
# Connect to PostgreSQL
docker exec -it collectoroom-db psql -U collectoroom

# List tables
\dt

# Query categories
SELECT * FROM categories;
```

---

## Rollback

If you need to revert to Firebase temporarily:

1. Keep both `firebase-admin.ts` and `db.ts` in the codebase
2. Use environment variable to switch:

```typescript
const USE_FIREBASE = process.env.USE_FIREBASE === 'true';
const db = USE_FIREBASE ? firebaseDb : postgresDb;
```

---

## Production Deployment

When ready for production:

1. Set up managed PostgreSQL (Railway, Supabase, Neon, etc.)
2. Set up S3-compatible storage (Cloudflare R2, Backblaze B2, etc.)
3. Update environment variables
4. No code changes needed - same interfaces

---

*Generated by MiniMax Agent - 2026-03-12*
