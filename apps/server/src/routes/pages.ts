import type { FastifyPluginAsync } from 'fastify';
import { pagesService } from '../services/pages.service.js';
import { requireAdmin } from '../middleware/auth.js';
import { CreatePageSchema, UpdatePageSchema, ReorderPagesSchema } from '@flame-claude/shared';

const pagesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const isAdmin = request.session.get('authenticated') === true;
    return reply.send({ data: await pagesService.findAll(isAdmin) });
  });

  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const isAdmin = request.session.get('authenticated') === true;
    const page = await pagesService.findBySlug(slug, isAdmin);
    if (!page) {
      return reply.code(404).send({ error: 'NotFound', message: 'Page not found', statusCode: 404 });
    }
    return reply.send({ data: page });
  });

  app.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreatePageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    try {
      return reply.code(201).send({ data: await pagesService.create(parsed.data) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('UNIQUE') || msg.includes('unique')) {
        return reply.code(409).send({ error: 'Conflict', message: 'A page with this slug already exists', statusCode: 409 });
      }
      throw e;
    }
  });

  app.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdatePageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    try {
      return reply.send({ data: await pagesService.update(parseInt(id, 10), parsed.data) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('UNIQUE') || msg.includes('unique')) {
        return reply.code(409).send({ error: 'Conflict', message: 'A page with this slug already exists', statusCode: 409 });
      }
      if (msg.includes('not found')) {
        return reply.code(404).send({ error: 'NotFound', message: 'Page not found', statusCode: 404 });
      }
      throw e;
    }
  });

  app.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await pagesService.delete(parseInt(id, 10));
    return reply.code(204).send();
  });

  app.post('/reorder', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = ReorderPagesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    await pagesService.reorder(parsed.data.ids);
    return reply.send({ data: { ok: true } });
  });
};

export default pagesRoutes;
