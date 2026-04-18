import type { FastifyPluginAsync } from 'fastify';
import { themesService } from '../services/themes.service.js';
import { requireAdmin } from '../middleware/auth.js';
import { CreateThemeSchema, UpdateThemeSchema } from '@flame-claude/shared';

const themesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    return reply.send({ data: await themesService.findAll() });
  });

  app.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateThemeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    return reply.code(201).send({ data: await themesService.create(parsed.data) });
  });

  app.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateThemeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    try {
      return reply.send({ data: await themesService.update(parseInt(id, 10), parsed.data) });
    } catch (err) {
      return reply.code(400).send({ error: 'BadRequest', message: String(err), statusCode: 400 });
    }
  });

  app.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await themesService.delete(parseInt(id, 10));
      return reply.code(204).send();
    } catch (err) {
      return reply.code(400).send({ error: 'BadRequest', message: String(err), statusCode: 400 });
    }
  });
};

export default themesRoutes;
