import type { FastifyPluginAsync } from 'fastify';
import { groupsService } from '../services/groups.service.js';
import { requireAdmin } from '../middleware/auth.js';
import { CreateGroupSchema, UpdateGroupSchema, ReorderGroupsSchema } from '@flame-claude/shared';

const groupsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    return reply.send({ data: await groupsService.findAll() });
  });

  app.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateGroupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    return reply.code(201).send({ data: await groupsService.create(parsed.data) });
  });

  app.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateGroupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    try {
      return reply.send({ data: await groupsService.update(parseInt(id, 10), parsed.data) });
    } catch {
      return reply.code(404).send({ error: 'NotFound', message: 'Group not found', statusCode: 404 });
    }
  });

  app.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await groupsService.delete(parseInt(id, 10));
    return reply.code(204).send();
  });

  app.post('/reorder', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = ReorderGroupsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
    }
    await groupsService.reorder(parsed.data.ids);
    return reply.send({ data: { ok: true } });
  });
};

export default groupsRoutes;
