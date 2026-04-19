# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
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

# Build server (skipLibCheck to avoid third-party type conflicts in strict tsc)
RUN pnpm --filter server exec tsc --skipLibCheck && pnpm --filter server exec tsc-alias

# Deploy server with production deps only (pnpm deploy handles monorepo correctly)
RUN pnpm --filter server deploy --prod --legacy /prod/server && \
    cp -r /app/apps/server/dist /prod/server/dist

# ---- Production stage ----
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /prod/server ./
COPY --from=builder /app/apps/web/dist ./web-dist
COPY --from=builder /app/apps/server/drizzle ./dist/apps/server/drizzle

VOLUME ["/data"]
ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=5005
ENV WEB_DIST=/app/web-dist

EXPOSE 5005

CMD ["node", "dist/apps/server/src/main.js"]
