import { useState } from 'react';
import { useSettings, useUpdateSettings, useThemes, useCreateTheme, useDeleteTheme } from '../../api/hooks.js';
import { Button } from '../../components/ui/Button.js';
import { Textarea, Input } from '../../components/ui/Form.js';
import { Card, ErrorMessage, Spinner, ConfirmDialog, Badge } from '../../components/ui/Primitives.js';
import { type Theme } from '@flame-claude/shared';

export default function AppearanceSettings() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: themes = [], isLoading: themesLoading } = useThemes();
  const updateSettings = useUpdateSettings();
  const deleteTheme = useDeleteTheme();
  const [deleteTarget, setDeleteTarget] = useState<Theme | null>(null);
  const [css, setCss] = useState(settings?.custom_css ?? '');
  const [cssSaved, setCssSaved] = useState(false);

  if (settingsLoading || themesLoading) return <Spinner />;

  const handleThemeSelect = async (id: number | null) => {
    await updateSettings.mutateAsync({ active_theme_id: id });
  };

  const handleSaveCSS = async () => {
    await updateSettings.mutateAsync({ custom_css: css });
    setCssSaved(true);
    setTimeout(() => setCssSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Theme selector */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">Theme</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themes.map((theme) => {
            const tokens = JSON.parse(theme.tokens_json) as Record<string, string>;
            const isActive = settings?.active_theme_id === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => handleThemeSelect(isActive ? null : theme.id)}
                className={`cursor-pointer rounded-[var(--radius-card)] border-2 p-3 transition-all ${
                  isActive ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                }`}
                style={{ backgroundColor: tokens['colorBackground'] }}
              >
                <div className="flex gap-1 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tokens['colorAccent'] }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tokens['colorSurface'] }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tokens['colorTextPrimary'] }} />
                </div>
                <p className="text-xs font-medium" style={{ color: tokens['colorTextPrimary'] }}>{theme.name}</p>
                {theme.is_builtin && <Badge>Built-in</Badge>}
                {!theme.is_builtin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(theme); }}
                    className="text-xs text-[var(--color-danger)] mt-1 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom CSS */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">Custom CSS</h2>
        <Textarea
          value={css}
          onChange={(e) => setCss(e.target.value)}
          placeholder="/* Add your custom CSS here */"
          className="font-mono text-xs min-h-[200px]"
        />
        <div className="flex items-center gap-4 mt-3">
          <Button onClick={handleSaveCSS} loading={updateSettings.isPending}>
            Apply CSS
          </Button>
          {cssSaved && <span className="text-sm text-green-600">Applied!</span>}
        </div>
      </section>

      {updateSettings.error && <ErrorMessage message={updateSettings.error.message} />}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await deleteTheme.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          title="Delete Theme"
          message={`Delete theme "${deleteTarget.name}"?`}
          loading={deleteTheme.isPending}
        />
      )}
    </div>
  );
}
