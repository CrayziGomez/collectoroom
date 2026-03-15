# ─────────────────────────────────────────────────────────────────────────────
# Collectoroom — multi-stage production Dockerfile
# Build: docker compose -f docker-compose.collectoroom.yml --env-file .env.collectoroom.prod build
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies + generate Prisma client ──────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# ── Stage 2: build the Next.js app ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# They must be passed as build args — runtime env vars are too late.
# Changing this value requires a full image rebuild (docker compose build).
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN npm run build

# ── Stage 3: minimal production runner ──────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output — only files needed to run the server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma client binary + CLI (needed for `prisma migrate deploy` at startup)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Migration files (prisma migrate deploy reads these)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Startup script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
