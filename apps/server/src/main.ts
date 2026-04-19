import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db/client.js';
import { themesService } from './services/themes.service.js';
import { syncService } from './services/sync.service.js';
import { settingsService } from './services/settings.service.js';
import authRoutes from './routes/auth.js';
import appsRoutes from './routes/apps.js';
import categoriesRoutes from './routes/categories.js';
import bookmarksRoutes from './routes/bookmarks.js';
import themesRoutes from './routes/themes.js';
import settingsRoutes from './routes/settings.js';
import integrationsRoutes from './routes/integrations.js';
import importRoutes from './routes/import.js';
import uploadRoutes from './routes/upload.js';
import groupsRoutes from './routes/groups.js';
import pagesRoutes from './routes/pages.js';

const DATA_DIR = process.env['DATA_DIR'] ?? join(process.cwd(), '../../data');
const UPLOADS_DIR = join(DATA_DIR, 'uploads');
const PORT = parseInt(process.env['PORT'] ?? '5005', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';
const SESSION_SECRET = process.env['SESSION_SECRET'] ?? 'flame-claude-dev-secret-change-me!!';
const IS_PROD = process.env['NODE_ENV'] === 'production';

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

// Run migrations on startup
const migrationsFolder = join(fileURLToPath(import.meta.url), '../../drizzle');
migrate(db, { migrationsFolder });

const app = Fastify({
  logger: {
    transport: !IS_PROD ? { target: 'pino-pretty' } : undefined,
  },
});

// Declare session type
declare module '@fastify/session' {
  interface FastifySessionObject {
    authenticated?: boolean;
  }
}

await app.register(fastifyHelmet, { contentSecurityPolicy: false });

await app.register(fastifyRateLimit, {
  global: true,
  max: 200,
  timeWindow: '1 minute',
});

await app.register(fastifyCookie);
await app.register(fastifySession, {
  secret: SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
  saveUninitialized: false,
});

await app.register(fastifyMultipart, {
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Serve uploaded icons
await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  decorateReply: false,
});

// Register all API routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(appsRoutes, { prefix: '/api/apps' });
await app.register(categoriesRoutes, { prefix: '/api/categories' });
await app.register(bookmarksRoutes, { prefix: '/api/bookmarks' });
await app.register(themesRoutes, { prefix: '/api/themes' });
await app.register(settingsRoutes, { prefix: '/api/settings' });
await app.register(integrationsRoutes, { prefix: '/api/integrations' });
await app.register(importRoutes, { prefix: '/api/import' });
await app.register(uploadRoutes, { prefix: '/api/upload' });
await app.register(groupsRoutes, { prefix: '/api/groups' });
await app.register(pagesRoutes, { prefix: '/api/pages' });

// Serve built frontend in production
if (IS_PROD) {
  const webDist = process.env.WEB_DIST
    ? resolve(process.env.WEB_DIST)
    : resolve(process.cwd(), '../web/dist');
  await app.register(fastifyStatic, {
    root: webDist,
    prefix: '/',
    wildcard: false,
  });
  app.setNotFoundHandler(async (_req, reply) => {
    return reply.sendFile('index.html', webDist);
  });
}

// Seed builtin themes
await themesService.seedBuiltins();

// Non-blocking startup syncs
const cfg = await settingsService.getAll();
if (cfg.docker_enabled) {
  syncService.runDockerSync().catch((e) => app.log.warn({ err: e }, 'Docker startup sync failed'));
}
if (cfg.kubernetes_enabled) {
  syncService.runKubernetesSync().catch((e) => app.log.warn({ err: e }, 'K8s startup sync failed'));
}

await app.listen({ port: PORT, host: HOST });
