import type { FastifyPluginAsync } from 'fastify';
import { syncService } from '../services/sync.service.js';
import { settingsService } from '../services/settings.service.js';
import { requireAdmin } from '../middleware/auth.js';

const integrationsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/docker/sync', { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      await syncService.runDockerSync();
      return reply.send({ data: { ok: true } });
    } catch (err) {
      return reply.code(500).send({ error: 'SyncError', message: String(err), statusCode: 500 });
    }
  });

  app.post('/kubernetes/sync', { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      await syncService.runKubernetesSync();
      return reply.send({ data: { ok: true } });
    } catch (err) {
      return reply.code(500).send({ error: 'SyncError', message: String(err), statusCode: 500 });
    }
  });

  app.get('/status', async (_req, reply) => {
    const cfg = await settingsService.getAll();
    const [dockerRun, k8sRun] = await Promise.all([
      syncService.getLatestRun('docker'),
      syncService.getLatestRun('kubernetes'),
    ]);
    return reply.send({
      data: {
        docker: { enabled: cfg.docker_enabled, lastRun: dockerRun },
        kubernetes: { enabled: cfg.kubernetes_enabled, lastRun: k8sRun },
      },
    });
  });

  app.get('/runs', { preHandler: requireAdmin }, async (_req, reply) => {
    return reply.send({ data: await syncService.getRuns() });
  });
};

export default integrationsRoutes;
