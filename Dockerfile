# ── Estágio 1: Dependências ──────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Instala dependências nativas necessárias para Prisma no Alpine
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci --only=production

# ── Estágio 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Gera o Prisma Client (usa schema sem banco real)
RUN npx prisma generate

# Build do Next.js (standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Estágio 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl

# Usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia artefatos do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia schema Prisma para migrations em runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
