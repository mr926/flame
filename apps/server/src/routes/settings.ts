import type { FastifyPluginAsync } from 'fastify';
import { settingsService } from '../services/settings.service.js';
import { requireAdmin } from '../middleware/auth.js';
import { UpdateSettingsSchema } from '@flame-claude/shared';

const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    return reply.send({ data: await settingsService.getAll() });
  });

  app.patch('/', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = UpdateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    return reply.send({ data: await settingsService.update(parsed.data) });
  });
};

export default settingsRoutes;
