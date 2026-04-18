import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import authRoutes from '../../src/routes/auth.js';
import appsRoutes from '../../src/routes/apps.js';
import categoriesRoutes from '../../src/routes/categories.js';
import bookmarksRoutes from '../../src/routes/bookmarks.js';

// Point to in-memory test DB
process.env['DATA_DIR'] = '/tmp/flame-test-' + Date.now();

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: 'test-secret-at-least-32-characters-long',
    cookie: { httpOnly: true, secure: false },
    saveUninitialized: false,
  });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(appsRoutes, { prefix: '/api/apps' });
  await app.register(categoriesRoutes, { prefix: '/api/categories' });
  await app.register(bookmarksRoutes, { prefix: '/api/bookmarks' });
  return app;
}

describe('Auth', () => {
  it('GET /api/auth/session returns setupRequired=true initially', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/auth/session' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { setupRequired: boolean; authenticated: boolean } };
    expect(body.data.setupRequired).toBe(true);
    expect(body.data.authenticated).toBe(false);
    await app.close();
  });

  it('POST /api/auth/setup creates admin and logs in', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { password: 'supersecret123' },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it('POST /api/auth/login rejects wrong password', async () => {
    const app = await buildApp();
    // Set up first
    await app.inject({ method: 'POST', url: '/api/auth/setup', payload: { password: 'supersecret123' } });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe('Apps CRUD', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let sessionCookie: string;

  beforeEach(async () => {
    app = await buildApp();
    const setup = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { password: 'testpassword!' },
    });
    sessionCookie = setup.headers['set-cookie'] as string;
  });

  afterEach(async () => { await app.close(); });

  it('GET /api/apps returns empty array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/apps', headers: { cookie: sessionCookie } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /api/apps creates an app', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/apps',
      headers: { cookie: sessionCookie },
      payload: { name: 'Test App', url: 'https://example.com', is_public: true, is_pinned: true },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { data: { name: string } };
    expect(body.data.name).toBe('Test App');
  });

  it('PATCH /api/apps/:id updates an app', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/apps',
      headers: { cookie: sessionCookie },
      payload: { name: 'Old Name', url: 'https://example.com' },
    });
    const created = JSON.parse(create.body) as { data: { id: number } };
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/apps/${created.data.id}`,
      headers: { cookie: sessionCookie },
      payload: { name: 'New Name' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { name: string } };
    expect(body.data.name).toBe('New Name');
  });

  it('DELETE /api/apps/:id removes an app', async () => {
    const create = await app.inject({
      method: 'POST', url: '/api/apps',
      headers: { cookie: sessionCookie },
      payload: { name: 'To Delete', url: 'https://example.com' },
    });
    const created = JSON.parse(create.body) as { data: { id: number } };
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/apps/${created.data.id}`,
      headers: { cookie: sessionCookie },
    });
    expect(del.statusCode).toBe(204);
  });

  it('GET /api/apps returns only public apps when unauthenticated', async () => {
    await app.inject({
      method: 'POST', url: '/api/apps',
      headers: { cookie: sessionCookie },
      payload: { name: 'Private App', url: 'https://example.com', is_public: false },
    });
    const res = await app.inject({ method: 'GET', url: '/api/apps' });
    const body = JSON.parse(res.body) as { data: Array<{ name: string }> };
    expect(body.data.every((a) => a.name !== 'Private App')).toBe(true);
  });
});

describe('Categories CRUD', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let sessionCookie: string;

  beforeEach(async () => {
    app = await buildApp();
    const setup = await app.inject({ method: 'POST', url: '/api/auth/setup', payload: { password: 'testpassword!' } });
    sessionCookie = setup.headers['set-cookie'] as string;
  });
  afterEach(() => app.close());

  it('creates and lists categories', async () => {
    await app.inject({ method: 'POST', url: '/api/categories', headers: { cookie: sessionCookie }, payload: { name: 'Dev Tools' } });
    const res = await app.inject({ method: 'GET', url: '/api/categories', headers: { cookie: sessionCookie } });
    const body = JSON.parse(res.body) as { data: Array<{ name: string }> };
    expect(body.data.some((c) => c.name === 'Dev Tools')).toBe(true);
  });
});

describe('Homepage pinned data', () => {
  it('returns pinned apps for public users', async () => {
    const app = await buildApp();
    const setup = await app.inject({ method: 'POST', url: '/api/auth/setup', payload: { password: 'testpassword!' } });
    const cookie = setup.headers['set-cookie'] as string;
    await app.inject({
      method: 'POST', url: '/api/apps',
      headers: { cookie },
      payload: { name: 'Pinned Public', url: 'https://example.com', is_public: true, is_pinned: true },
    });
    await app.inject({
      method: 'POST', url: '/api/apps',
      headers: { cookie },
      payload: { name: 'Private Hidden', url: 'https://example.com', is_public: false, is_pinned: true },
    });
    const res = await app.inject({ method: 'GET', url: '/api/apps' });
    const body = JSON.parse(res.body) as { data: Array<{ name: string }> };
    expect(body.data.some((a) => a.name === 'Pinned Public')).toBe(true);
    expect(body.data.some((a) => a.name === 'Private Hidden')).toBe(false);
    await app.close();
  });
});
