# CollectoRoom — Project Plan

> Living document. Update status as work progresses.
> Last updated: 2026-03-13 (session 2)

---

## Project Overview

**CollectoRoom** is a digital collection management platform. Users create and manage cards (collectible items) organised into collections, with a public gallery for discovery and social features (follows, messaging, notifications).

### Current Stack (post-Firebase migration)

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Auth | Clerk |
| Database | PostgreSQL via Prisma ORM |
| Storage | S3-compatible (MinIO locally, any S3 in production) |
| UI | Tailwind CSS + Radix UI (shadcn components) |
| Deployment | Docker (containers) |

### Local Dev Services

The collectoroom stack runs as a standalone Docker project (NOT `docker-compose.dev.yml` — use `docker-compose.collectoroom.yml`):

```bash
docker compose -f docker-compose.collectoroom.yml --env-file .env.collectoroom up -d
npm run dev
```

- PostgreSQL: `localhost:5433` (user: collectoroom / collectoroompass / db: collectoroomdb)
- MinIO API: `localhost:9002`
- MinIO Console: `localhost:9003` (collectoroomminio / collectoroomminio123)
- Adminer: `localhost:8081`

> Note: Non-standard ports (5433, 9002, 9003) avoid conflicts with the higroponics project running on the same host.

---

## Phase Status Summary

| Phase | Name | Status |
|---|---|---|
| 0 | Firebase Migration — Infrastructure | ✅ DONE |
| 1 | Firebase Migration — Action Files | 🔶 PARTIAL |
| 2 | Bug Fixes (blocking) | ✅ DONE |
| 3 | Admin Dashboard | ✅ DONE |
| 4 | Core User Features | 🔶 PARTIAL |
| 5 | Gallery & Public Views | 🔶 PARTIAL |
| 6 | Social Features | 🔶 PARTIAL |
| 7 | Docker Deployment | 🔶 PARTIAL |
| 8 | Polish & Production | ❌ TODO |

---

## Phase 0 — Firebase Migration: Infrastructure ✅ DONE

All infrastructure has been replaced.

- [x] Firebase Auth → Clerk
- [x] Firestore → PostgreSQL + Prisma schema (`prisma/schema.prisma`)
- [x] Firebase Storage → S3 (`src/lib/storage.ts`)
- [x] Docker Compose for local dev (`docker-compose.dev.yml`)
- [x] Database service layer (`src/lib/db.ts`)
- [x] Prisma client singleton (`src/lib/prisma.ts`)
- [x] DB init SQL (`db/init.sql`)

---

## Phase 1 — Firebase Migration: Action Files 🔶 PARTIAL

| File | Status | Notes |
|---|---|---|
| `category-actions.ts` | ✅ Done | create, get, update, delete |
| `admin-actions.ts` | ✅ Done | grantAdminRole only |
| `collection-actions.ts` | 🔶 Partial | createCollection only — missing get/update/delete |
| `user-actions.ts` | ✅ Done | getUser, updateUsername, deleteUser, toggleFollow, updateAvatar |
| `card-actions.ts` | ✅ Done | createCard, updateCard, deleteCard |
| `site-content.ts` | ✅ Done | getSiteContent, updateSiteContent |

### Remaining for Phase 1

- [ ] `collection-actions.ts` — add `getCollection`, `getUserCollections`, `updateCollection`, `deleteCollection`
- [ ] Clerk webhook (`/api/webhooks/clerk`) to auto-create `users` DB row on sign-up

---

## Phase 2 — Bug Fixes (Blocking) ✅ DONE

All blocking bugs fixed in session 2 (2026-03-13). Build passes cleanly.

### Fixed

- [x] BUG-01: `db.ts` exported undefined `getPool` → now re-exports Prisma client
- [x] BUG-02: `AdminPageClient` prop mismatch → full dashboard built with correct props
- [x] BUG-03: `auth-context.tsx` redirect loop → added `hasRedirected` ref, only redirects once per sign-in
- [x] BUG-04: `api/users/[id]` returned `username: user.id` → now fetches from Clerk
- [x] BUG-05: `site-content.ts` wrong field names `heroImageUrl/heroImagePath` → fixed to `hero_image_url/hero_image_path`
- [x] BUG-06: `AuthContextProvider` never mounted in layout → added to `app/layout.tsx`
- [x] BUG-07: `middleware.ts` deprecated Clerk v7 API → updated to `createRouteMatcher` pattern
- [x] `auth()` calls missing `await` in API routes → fixed in notifications, collections, users routes
- [x] Next.js 15 async `params` pattern → fixed in users/[id], edit/page, card pages
- [x] Firebase imports still present in contact, create, connections pages → replaced with Prisma/API
- [x] `CardClient.tsx` had duplicate component → kept the better one (carousel + share)
- [x] Missing `FollowButton`/`MessageButton` in profile page → created
- [x] `EditCardClient` import path wrong in edit/page.tsx → fixed to `'../EditCardClient'`

---

## Phase 2 — Bug Fixes (Blocking) — ORIGINAL NOTES

These are confirmed bugs that will cause runtime/compile errors.

### BUG-01: `src/lib/db.ts` — `getPool` export undefined

`db.ts` exports `getPool` at line 119 but the function is never defined in the file. Will cause a compile/import error.

**Fix:** Either define a `getPool()` helper that returns the underlying Prisma client, or remove the export.

### BUG-02: `admin/page.tsx` passes props that `AdminPageClient` ignores

`page.tsx` passes `addCategoryAction`, `deleteCategoryAction`, `deleteUserAction`, etc. as props, but `AdminPageClient.tsx` takes no props. TypeScript will error. The current component is a stub that doesn't use any of those actions.

**Fix:** Complete the admin dashboard (Phase 3) which will consume these props, or temporarily align the component signature.

### BUG-03: `auth-context.tsx` redirects on every user sync

When a signed-in user's profile is fetched from `/api/users/:id`, the context unconditionally calls `router.push('/admin')` or `router.push('/my-collectoroom')`. This causes every page navigation to redirect.

```ts
// Line 57 — fires on every sync, not just login
if (json.isAdmin) router.push('/admin');
else router.push('/my-collectoroom');
```

**Fix:** Only redirect on the initial sign-in event, not on every profile fetch. Track a `hasRedirected` ref or check current pathname.

### BUG-04: `api/users/[id]/route.ts` returns wrong username

The GET handler returns `username: user.id` instead of the actual username. The Prisma `User` model doesn't store username (Clerk owns it), but the response should at minimum not return the user's ID as their username.

**Fix:** Either fetch the username from Clerk in the API route, or remove the username field from this endpoint and let the auth context use Clerk's data.

### BUG-05: `site-content.ts` Prisma field name mismatch

The upsert uses camelCase field names (`heroImageUrl`, `heroImagePath`) but the Prisma model uses `hero_image_url` and `hero_image_path` (mapped fields). Prisma accepts camelCase for mapped fields via the generated client, so verify this actually errors — it may work via the Prisma client mapping.

**Action:** Test the site content update and confirm no runtime error.

### BUG-06: `types.ts` User type mismatch

`types.ts` defines `User` with `uid`, `avatarUrl`, `tier`, `isAdmin` fields but `user-actions.ts::getUser` returns a different shape with `planId`, `plan`, `cardCount`, `collectionCount`. Parts of the app use each inconsistently.

**Fix:** Unify the User type. Decide whether `tier` or `planId`/`plan` is canonical and align all usages.

### BUG-07: `middleware.ts` — deprecated Clerk API

`clerkMiddleware` is called with a config object `{ publicRoutes }`. In Clerk v7, `publicRoutes` is no longer supported this way — routes are instead made public with `auth.protect()` in individual routes.

**Fix:** Update middleware to Clerk v7 pattern:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isPublicRoute = createRouteMatcher(['/', '/gallery', '/pricing', '/login(.*)', '/signup(.*)', '/api/users(.*)']);
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});
```

---

## Phase 3 — Admin Dashboard ✅ DONE

Current state: `AdminPageClient.tsx` shows a welcome message with a "Future admin-specific components will be placed here" comment. No real functionality.

### 3.1 Admin Dashboard Layout ✅

- [x] Tabbed layout (Overview / Users / Categories / Site Content)
- [x] Stats cards (total users, collections, cards, categories)

### 3.2 User Management Tab ✅

- [x] List all users from Clerk + DB cross-reference
- [x] Show username, email, admin badge, collection/card counts
- [x] Grant / revoke admin privilege
- [x] Delete user (with confirmation dialog)

### 3.3 Category Management Tab ✅

- [x] List all categories
- [x] Add category form
- [x] Edit category name (inline form)
- [x] Delete category with confirmation + safeguard message

### 3.4 Site Content Tab ✅

- [x] Hero title and subtitle editor
- [x] Hero image upload
- [x] Saved to DB + S3 via existing actions

### 3.5 Collections Overview Tab

- [ ] Not yet implemented (future phase)

---

## Phase 4 — Core User Features 🔶 PARTIAL

### 4.1 My CollectoRoom Dashboard

- [x] Collections list (fetches from `/api/collections/my`)
- [x] Tier/plan usage progress bars
- [x] Create Collection button (links to `/my-collectoroom/create`)
- [ ] Delete Collection from dashboard (dropdown has button but no handler)
- [ ] Collection cover image shown (requires non-empty `coverImage` — depends on cards being added)

### 4.2 Create / Edit Collection

- [ ] Audit `my-collectoroom/create` page — check if it posts to `createCollection` correctly
- [ ] Category dropdown populated from DB (currently may use hardcoded list)
- [ ] Edit collection page (`/collections/[id]/edit`)

### 4.3 Cards within a Collection

- [ ] Audit `/collections/[id]` — verify card list loads from DB
- [ ] Add card page (`/collections/[id]/add`) — verify image upload works with S3
- [ ] Edit card page (`/collections/[id]/cards/[cardId]`)

### 4.4 Profile Settings

- [x] `SettingsPageClient` with `updateAvatarAction` prop
- [ ] Audit settings page — ensure avatar upload reaches S3 and updates Clerk
- [ ] Username update form

### 4.5 Clerk Webhook — Auto User Creation

When a new user signs up via Clerk, a row needs to be created in the `users` table automatically.

- [ ] Create `/api/webhooks/clerk/route.ts`
- [ ] Verify Clerk webhook secret in env (`CLERK_WEBHOOK_SECRET`)
- [ ] Handle `user.created` event → `prisma.user.create`
- [ ] Handle `user.deleted` event → `prisma.user.deleteMany`

---

## Phase 5 — Gallery & Public Views 🔶 PARTIAL

- [ ] Audit `GalleryClient.tsx` — verify it fetches real collections from DB (not mock data)
- [ ] Public collection view `/collections/[id]` — verify read for non-owners
- [ ] Public user profile `/profile/[username]` — show public collections
- [ ] Category filter on gallery
- [ ] Search/sort on gallery

---

## Phase 6 — Social Features 🔶 PARTIAL

### 6.1 Follow System

- [x] `toggleFollow` action (DB logic done)
- [ ] Audit `/api/follow/route.ts`
- [ ] Follow button component working end-to-end

### 6.2 Notifications

- [ ] Audit `/api/notifications/route.ts` and `/api/notifications/counts/route.ts`
- [ ] Notification creation on follow events
- [ ] Notification creation on new public collection events
- [ ] Notifications page UI (`/notifications`)

### 6.3 Messages / Chats

- [ ] Audit `/api/chats/route.ts` and `/api/chats/[chatId]/route.ts`
- [ ] Messages page UI (`/messages`)
- [ ] Real-time or polling updates

---

## Phase 7 — Docker Deployment 🔶 PARTIAL

### 7.1 Existing Docker Files

- `docker-compose.dev.yml` — local dev (postgres + minio) ✅
- `docker-compose.collectoroom.yml` — production-style (postgres + adminer + minio) but no Next.js app container yet

### 7.2 Add Next.js App Container

- [ ] Create `Dockerfile` for Next.js app
  - Multi-stage build (deps → builder → runner)
  - `NODE_ENV=production`
  - Standalone output (`output: 'standalone'` in `next.config.ts`)
- [ ] Add `app` service to `docker-compose.collectoroom.yml`
  - Depends on `db` (with healthcheck)
  - Mounts env vars via `.env` file or environment section
- [ ] Add `nginx` or Traefik reverse proxy (optional but recommended)

### 7.3 Environment Variables for Production

Create `.env.production.example`:

```env
# Database
DATABASE_URL=postgresql://collectoroom:PASSWORD@db:5432/collectoroom

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# S3 Storage (MinIO or cloud)
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=collectoroom
S3_PUBLIC_URL=http://your-domain:9000/collectoroom

# Postgres service
POSTGRES_USER=collectoroom
POSTGRES_PASSWORD=...
POSTGRES_DB=collectoroom
POSTGRES_PORT=5432
MINIO_ROOT_USER=...
MINIO_ROOT_PASSWORD=...
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
ADMINER_PORT=8080
```

### 7.4 Database Migrations in Production

- [ ] Decide on migration strategy: `prisma migrate deploy` vs `prisma db push`
- [ ] Add migration step to deployment (entrypoint script or separate init container)

### 7.5 MinIO Production Bucket Initialisation

- [ ] Add `minio-init` service to production compose (same pattern as dev)

---

## Phase 8 — Polish & Production ❌ TODO

- [ ] `next.config.ts` — add image domains for MinIO and Clerk avatar URLs
- [ ] Remove all Firebase references from codebase (firestore imports in old files)
- [ ] Remove `firebase.ts` from `src/lib/` (appears to still exist)
- [ ] Clean up `user-actions-dev.ts` (development file, should not be in production)
- [ ] Remove mock data from `constants.tsx` (`MOCK_USERS`, `MOCK_COLLECTIONS`, `MOCK_CARDS`)
- [ ] Remove leftover Firestore index comment from `my-collectoroom/page.tsx`
- [ ] Prisma version update (`@prisma/client: ^4.16.2` is old — v5/v6 available)
- [ ] Environment variable validation on startup
- [ ] Error boundary components
- [ ] Custom 404 page (exists as `not-found.tsx`)
- [ ] SEO metadata on key pages

---

## Key File Map

```
src/
├── app/
│   ├── actions/
│   │   ├── admin-actions.ts       # grantAdminRole
│   │   ├── card-actions.ts        # createCard, updateCard, deleteCard
│   │   ├── category-actions.ts    # createCategory, getCategories, updateCategory, deleteCategory
│   │   ├── collection-actions.ts  # createCollection (INCOMPLETE)
│   │   ├── site-content.ts        # getSiteContent, updateSiteContent
│   │   └── user-actions.ts        # getUser, updateUsername, deleteUser, toggleFollow, updateAvatar
│   ├── api/
│   │   ├── auth/route.ts          # Clerk session noop (legacy compat)
│   │   ├── collections/my/route.ts
│   │   ├── chats/[chatId]/route.ts
│   │   ├── chats/route.ts
│   │   ├── follow/route.ts
│   │   ├── notifications/counts/route.ts
│   │   ├── notifications/route.ts
│   │   └── users/[id]/route.ts    # BUG: returns user.id as username
│   └── (pages)/
│       ├── admin/                 # STUB — needs Phase 3
│       ├── gallery/
│       ├── my-collectoroom/       # Dashboard + create + settings + connections
│       ├── collections/[id]/      # Collection view + cards + add + edit
│       ├── profile/[username]/    # Public user profile
│       ├── messages/
│       └── notifications/
├── lib/
│   ├── db.ts                      # BUG: exports undefined getPool
│   ├── prisma.ts                  # Singleton Prisma client
│   ├── storage.ts                 # S3 upload/delete helpers
│   ├── types.ts                   # BUG: User type inconsistency
│   ├── constants.tsx              # Categories, pricing tiers, tier limits
│   └── utils.ts
├── contexts/
│   └── auth-context.tsx           # BUG: redirects on every user sync
├── components/
│   ├── layout/Header.tsx
│   └── ui/
└── middleware.ts                  # BUG: deprecated Clerk v7 API
```

---

## Recommended Work Order

1. **Phase 2 bugs** — fix the redirect loop (BUG-03) and middleware (BUG-07) first, as they break navigation
2. **Phase 1 remainder** — add missing collection actions + Clerk webhook
3. **Phase 3 admin dashboard** — high priority per project goal
4. **Phase 4 core features** — audit and fix create/edit flows
5. **Phase 7 Docker** — add Dockerfile + production compose
6. **Phase 5 & 6** — gallery, social
7. **Phase 8 cleanup** — remove Firebase remnants, polish

---

*Document maintained by Claude Code — update as features are completed.*
