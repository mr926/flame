import { useState } from 'react';
import { useSettings, useUpdateSettings, useIntegrationStatus, useSyncDocker, useSyncKubernetes } from '../../api/hooks.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Form.js';
import { Toggle } from '../../components/ui/Form.js';
import { Card, ErrorMessage, Spinner, Badge } from '../../components/ui/Primitives.js';

export default function IntegrationsSettings() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const { data: status } = useIntegrationStatus();
  const syncDocker = useSyncDocker();
  const syncK8s = useSyncKubernetes();
  const [saved, setSaved] = useState(false);

  if (isLoading) return <Spinner />;

  const save = async (patch: Parameters<typeof update.mutateAsync>[0]) => {
    await update.mutateAsync(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderLastRun = (lastRun: unknown) => {
    if (!lastRun || typeof lastRun !== 'object') return <span className="text-xs text-[var(--color-text-secondary)]">Never</span>;
    const run = lastRun as { status: string; started_at: string; meta_json?: string | null };
    const meta = run.meta_json ? JSON.parse(run.meta_json) as Record<string, unknown> : {};
    return (
      <div className="flex items-center gap-2">
        <Badge variant={run.status === 'success' ? 'success' : 'error'}>{run.status}</Badge>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {new Date(run.started_at).toLocaleString()}
          {meta['synced'] !== undefined && ` — ${meta['synced']} synced`}
          {meta['error'] && ` — ${meta['error']}`}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Docker */}
      <Card>
        <h2 className="font-semibold text-[var(--color-text-primary)] mb-4">Docker</h2>
        <div className="space-y-4">
          <Toggle
            label="Enable Docker auto-discovery"
            description="Automatically create apps from Docker containers with flame.name and flame.url labels"
            checked={settings?.docker_enabled ?? false}
            onChange={(v) => save({ docker_enabled: v })}
          />
          {settings?.docker_enabled && (
            <>
              <Input
                label="Docker Host"
                defaultValue={settings.docker_host}
                onBlur={(e) => save({ docker_host: e.target.value })}
              />
              <Toggle
                label="Overwrite app name on sync"
                checked={settings.docker_overwrite_name}
                onChange={(v) => save({ docker_overwrite_name: v })}
              />
              <Toggle
                label="Overwrite app URL on sync"
                checked={settings.docker_overwrite_url}
                onChange={(v) => save({ docker_overwrite_url: v })}
              />
              <Toggle
                label="Overwrite app icon on sync"
                checked={settings.docker_overwrite_icon}
                onChange={(v) => save({ docker_overwrite_icon: v })}
              />
              <Toggle
                label="Unpin app when container stops"
                checked={settings.docker_unpin_stopped}
                onChange={(v) => save({ docker_unpin_stopped: v })}
              />
              <div className="flex items-center gap-4 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => syncDocker.mutate()}
                  loading={syncDocker.isPending}
                >
                  Sync Now
                </Button>
                <div>{renderLastRun(status?.docker.lastRun)}</div>
              </div>
              {syncDocker.error && <ErrorMessage message={syncDocker.error.message} />}
            </>
          )}
        </div>
      </Card>

      {/* Kubernetes */}
      <Card>
        <h2 className="font-semibold text-[var(--color-text-primary)] mb-4">Kubernetes</h2>
        <div className="space-y-4">
          <Toggle
            label="Enable Kubernetes auto-discovery"
            description="Automatically create apps from Ingress resources with flame.name annotations"
            checked={settings?.kubernetes_enabled ?? false}
            onChange={(v) => save({ kubernetes_enabled: v })}
          />
          {settings?.kubernetes_enabled && (
            <>
              <Toggle
                label="Overwrite app name on sync"
                checked={settings.kubernetes_overwrite_name}
                onChange={(v) => save({ kubernetes_overwrite_name: v })}
              />
              <Toggle
                label="Overwrite app URL on sync"
                checked={settings.kubernetes_overwrite_url}
                onChange={(v) => save({ kubernetes_overwrite_url: v })}
              />
              <Toggle
                label="Overwrite app icon on sync"
                checked={settings.kubernetes_overwrite_icon}
                onChange={(v) => save({ kubernetes_overwrite_icon: v })}
              />
              <Toggle
                label="Unpin app when ingress is removed"
                checked={settings.kubernetes_unpin_stopped}
                onChange={(v) => save({ kubernetes_unpin_stopped: v })}
              />
              <div className="flex items-center gap-4 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => syncK8s.mutate()}
                  loading={syncK8s.isPending}
                >
                  Sync Now
                </Button>
                <div>{renderLastRun(status?.kubernetes.lastRun)}</div>
              </div>
              {syncK8s.error && <ErrorMessage message={syncK8s.error.message} />}
            </>
          )}
        </div>
      </Card>

      {saved && <p className="text-sm text-green-600">Saved!</p>}
    </div>
  );
}
