import type { FastifyPluginAsync } from 'fastify';
import { authService } from '../services/auth.service.js';
import { SetupSchema, LoginSchema } from '@flame-claude/shared';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/setup',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const parsed = SetupSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
      }
      if (await authService.hasAdmin()) {
        return reply.code(409).send({ error: 'Conflict', message: 'Admin already set up', statusCode: 409 });
      }
      await authService.setup(parsed.data.username, parsed.data.password);
      (request.session as any).authenticated = true;
      return reply.code(201).send({ data: { ok: true } });
    },
  );

  app.post(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const parsed = LoginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', message: parsed.error.message, statusCode: 400 });
      }
      const ok = await authService.verify(parsed.data.username, parsed.data.password);
      if (!ok) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
      }
      (request.session as any).authenticated = true;
      return reply.send({ data: { ok: true } });
    },
  );

  app.post('/logout', async (request, reply) => {
    await request.session.destroy();
    return reply.send({ data: { ok: true } });
  });

  app.get('/session', async (request, reply) => {
    const authenticated = (request.session as any).authenticated === true;
    const setupRequired = !(await authService.hasAdmin());
    return reply.send({ data: { authenticated, setupRequired } });
  });
};

export default authRoutes;
