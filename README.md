# CollectoRoom

A digital collection management platform. Create cards for collectible items, organise them into collections, share publicly in a gallery, and connect with other collectors.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Auth | Clerk |
| Database | PostgreSQL via Prisma ORM |
| Storage | S3-compatible (MinIO locally) |
| UI | Tailwind CSS + Radix UI (shadcn) |
| Deployment | Docker |

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1. Start local services

```bash
npm run db:up
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **MinIO** (S3-compatible storage) on `localhost:9000`
- **MinIO Console** on `localhost:9001` (login: `minioadmin` / `minioadmin123`)

### 2. Configure environment

Copy the example env file and fill in your Clerk keys:

```bash
cp .env.local.example .env.local
```

Required variables:

```env
# Clerk (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (pre-configured for local Docker)
DATABASE_URL=postgresql://collectoroom:dev_password_change_me@localhost:5432/collectoroom

# S3 Storage (pre-configured for local MinIO)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
S3_BUCKET=collectoroom
S3_PUBLIC_URL=http://localhost:9000/collectoroom
```

### 3. Install dependencies and run migrations

```bash
npm install
npx prisma generate
npx prisma db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run db:up            # Start PostgreSQL + MinIO containers
npm run db:down          # Stop containers
npm run db:logs          # Tail container logs
npm run db:reset         # Wipe and restart containers
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate:dev  # Create and apply a new migration
npm run prisma:dbpush    # Push schema directly (dev only)
```

---

## Database

Connect directly to the running PostgreSQL instance:

```bash
docker exec -it collectoroom-db psql -U collectoroom
```

Prisma schema: [`prisma/schema.prisma`](prisma/schema.prisma)

Key tables: `users`, `collections`, `cards`, `card_images`, `categories`, `site_content`, `chats`, `messages`, `notifications`, `user_follows`

---

## Storage

Files are stored in S3-compatible object storage under the following paths:

```
collectoroom/
├── users/{userId}/cards/{cardId}/{uuid}.{ext}
└── site-content/hero/{uuid}.{ext}
```

Browse uploaded files via the MinIO console at [http://localhost:9001](http://localhost:9001).

---

## Project Status

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full phase-by-phase plan, current status, and known bugs.

---

## Auth

Authentication is handled entirely by [Clerk](https://clerk.com). The application stores a minimal `users` record in PostgreSQL keyed by the Clerk user ID, to hold app-specific data (plan, counts, admin flag).

A Clerk webhook at `/api/webhooks/clerk` should auto-create this DB row on sign-up (see PROJECT_PLAN Phase 4.5).

---

## Deployment

For Docker-based deployment, see `docker-compose.collectoroom.yml`. A Next.js `Dockerfile` is planned (Phase 7 of PROJECT_PLAN.md).
