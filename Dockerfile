# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/
COPY apps/web/ ./apps/web/

# Build shared package
RUN pnpm --filter @flame-claude/shared build

# Build web
RUN pnpm --filter web build

# Build server
RUN pnpm --filter server build

# ---- Production stage ----
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifests
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install production deps only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/drizzle ./apps/server/drizzle
COPY --from=builder /app/apps/web/dist ./apps/web/dist

VOLUME ["/data"]
ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=5005

EXPOSE 5005

WORKDIR /app/apps/server
CMD ["node", "dist/main.js"]
