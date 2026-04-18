import type { FastifyPluginAsync } from 'fastify';
import { bookmarksService } from '../services/bookmarks.service.js';
import { requireAdmin } from '../middleware/auth.js';
import { CreateBookmarkSchema, UpdateBookmarkSchema, ReorderBookmarksSchema } from '@flame-claude/shared';

const bookmarksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const isAdmin = (request.session as any).authenticated === true;
    const { category_id } = request.query as { category_id?: string };
    const data = await bookmarksService.findAll(
      isAdmin,
      category_id !== undefined ? parseInt(category_id, 10) : undefined,
    );
    return reply.send({ data });
  });

  app.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateBookmarkSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    return reply.code(201).send({ data: await bookmarksService.create(parsed.data) });
  });

  app.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateBookmarkSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    try {
      return reply.send({ data: await bookmarksService.update(parseInt(id, 10), parsed.data) });
    } catch {
      return reply.code(404).send({ error: 'NotFound', message: 'Bookmark not found', statusCode: 404 });
    }
  });

  app.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await bookmarksService.delete(parseInt(id, 10));
    return reply.code(204).send();
  });

  app.post('/reorder', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = ReorderBookmarksSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    await bookmarksService.reorder(parsed.data.category_id, parsed.data.ids);
    return reply.send({ data: { ok: true } });
  });
};

export default bookmarksRoutes;
