import type { FastifyPluginAsync } from 'fastify';
import { appsService } from '../services/apps.service.js';
import { requireAdmin } from '../middleware/auth.js';
import { CreateAppSchema, UpdateAppSchema, ReorderAppsSchema } from '@flame-claude/shared';

const appsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const isAdmin = (request.session as any).authenticated === true;
    return reply.send({ data: await appsService.findAll(isAdmin) });
  });

  app.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateAppSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    return reply.code(201).send({ data: await appsService.create(parsed.data) });
  });

  app.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateAppSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    try {
      return reply.send({ data: await appsService.update(parseInt(id, 10), parsed.data) });
    } catch {
      return reply.code(404).send({ error: 'NotFound', message: 'App not found', statusCode: 404 });
    }
  });

  app.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await appsService.delete(parseInt(id, 10));
    return reply.code(204).send();
  });

  app.post('/reorder', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = ReorderAppsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    await appsService.reorder(parsed.data.ids);
    return reply.send({ data: { ok: true } });
  });
};

export default appsRoutes;
