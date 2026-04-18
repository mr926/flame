import type { FastifyPluginAsync } from 'fastify';
import { categoriesService } from '../services/categories.service.js';
import { requireAdmin } from '../middleware/auth.js';
import { CreateCategorySchema, UpdateCategorySchema, ReorderCategoriesSchema } from '@flame-claude/shared';

const categoriesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const isAdmin = request.session.get('authenticated') === true;
    return reply.send({ data: await categoriesService.findAll(isAdmin) });
  });

  app.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    return reply.code(201).send({ data: await categoriesService.create(parsed.data) });
  });

  app.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    try {
      return reply.send({ data: await categoriesService.update(parseInt(id, 10), parsed.data) });
    } catch {
      return reply.code(404).send({ error: 'NotFound', message: 'Category not found', statusCode: 404 });
    }
  });

  app.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await categoriesService.delete(parseInt(id, 10));
    return reply.code(204).send();
  });

  app.post('/reorder', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = ReorderCategoriesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    await categoriesService.reorder(parsed.data.ids);
    return reply.send({ data: { ok: true } });
  });
};

export default categoriesRoutes;
