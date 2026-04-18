import { db } from '../db/client.js';
import { sync_runs } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { settingsService } from './settings.service.js';
import { appsService } from './apps.service.js';

export class SyncService {
  async runDockerSync(): Promise<void> {
    const cfg = await settingsService.getAll();
    if (!cfg.docker_enabled) return;

    const now = new Date().toISOString();
    const [run] = await db
      .insert(sync_runs)
      .values({ source: 'docker', status: 'running', started_at: now })
      .returning();

    try {
      const Dockerode = (await import('dockerode')).default;
      const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });
      const containers = await docker.listContainers({ all: false });

      let synced = 0;
      for (const c of containers) {
        const labels = c.Labels ?? {};
        const name = labels['flame.name'];
        const url = labels['flame.url'];
        if (!name || !url) continue;
        await appsService.upsertFromSync(
          'docker',
          `docker:${c.Id}`,
          { name, url, icon_value: labels['flame.icon'] },
          {
            name: cfg.docker_overwrite_name,
            url: cfg.docker_overwrite_url,
            icon: cfg.docker_overwrite_icon,
            unpinStopped: cfg.docker_unpin_stopped,
          },
          true,
        );
        synced++;
      }

      await db
        .update(sync_runs)
        .set({ status: 'success', finished_at: new Date().toISOString(), meta_json: JSON.stringify({ synced }) })
        .where(eq(sync_runs.id, run!.id));
    } catch (err) {
      await db
        .update(sync_runs)
        .set({ status: 'error', finished_at: new Date().toISOString(), meta_json: JSON.stringify({ error: String(err) }) })
        .where(eq(sync_runs.id, run!.id));
      throw err;
    }
  }

  async runKubernetesSync(): Promise<void> {
    const cfg = await settingsService.getAll();
    if (!cfg.kubernetes_enabled) return;

    const now = new Date().toISOString();
    const [run] = await db
      .insert(sync_runs)
      .values({ source: 'kubernetes', status: 'running', started_at: now })
      .returning();

    try {
      const k8s = await import('@kubernetes/client-node');
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      const netApi = kc.makeApiClient(k8s.NetworkingV1Api);
      const listResult = await netApi.listIngressForAllNamespaces();
      // kubernetes client v0.x returns { body } wrapper; v1.x returns the list directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ingressList = (listResult as any).body ?? listResult;

      let synced = 0;
      for (const ingress of ingressList.items) {
        const ann = ingress.metadata?.annotations ?? {};
        const name = ann['flame.name'] ?? ingress.metadata?.name;
        const host = ingress.spec?.rules?.[0]?.host;
        if (!name || !host) continue;
        await appsService.upsertFromSync(
          'kubernetes',
          `k8s:${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
          { name, url: `https://${host}`, icon_value: ann['flame.icon'] },
          {
            name: cfg.kubernetes_overwrite_name,
            url: cfg.kubernetes_overwrite_url,
            icon: cfg.kubernetes_overwrite_icon,
            unpinStopped: cfg.kubernetes_unpin_stopped,
          },
          true,
        );
        synced++;
      }

      await db
        .update(sync_runs)
        .set({ status: 'success', finished_at: new Date().toISOString(), meta_json: JSON.stringify({ synced }) })
        .where(eq(sync_runs.id, run!.id));
    } catch (err) {
      await db
        .update(sync_runs)
        .set({ status: 'error', finished_at: new Date().toISOString(), meta_json: JSON.stringify({ error: String(err) }) })
        .where(eq(sync_runs.id, run!.id));
      throw err;
    }
  }

  async getLatestRun(source: 'docker' | 'kubernetes') {
    const [row] = await db
      .select()
      .from(sync_runs)
      .where(eq(sync_runs.source, source))
      .orderBy(desc(sync_runs.started_at))
      .limit(1);
    return row ?? null;
  }

  async getRuns(limit = 20) {
    return db.select().from(sync_runs).orderBy(desc(sync_runs.started_at)).limit(limit);
  }
}

export const syncService = new SyncService();
