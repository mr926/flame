import type { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../middleware/auth.js';
import { join, extname, basename } from 'node:path';
import { createWriteStream, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';

const ALLOWED_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);
const DATA_DIR = process.env['DATA_DIR'] ?? join(process.cwd(), '../../data');
const UPLOADS_DIR = join(DATA_DIR, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/icon', { preHandler: requireAdmin }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'BadRequest', message: 'No file uploaded', statusCode: 400 });
    }
    const ext = extname(data.filename).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return reply.code(400).send({ error: 'BadRequest', message: 'File type not allowed', statusCode: 400 });
    }
    const filename = `${randomUUID()}${ext}`;
    await pipeline(data.file, createWriteStream(join(UPLOADS_DIR, filename)));
    return reply.send({ data: { filename, url: `/uploads/${filename}` } });
  });
};

export default uploadRoutes;
