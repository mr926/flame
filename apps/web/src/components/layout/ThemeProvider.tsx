import { useEffect } from 'react';
import { useSettings, useThemes } from '../../api/hooks.js';
import type { ThemeTokens } from '@flame-claude/shared';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();
  const { data: themes } = useThemes();

  useEffect(() => {
    if (!settings) return;

    let tokens: ThemeTokens | null = null;
    if (settings.active_theme_id && themes) {
      const theme = themes.find((t) => t.id === settings.active_theme_id);
      if (theme) {
        try {
          tokens = JSON.parse(theme.tokens_json) as ThemeTokens;
        } catch {
          // ignore
        }
      }
    }

    if (tokens) {
      const root = document.documentElement;
      root.style.setProperty('--color-bg', tokens.colorBackground);
      root.style.setProperty('--color-surface', tokens.colorSurface);
      root.style.setProperty('--color-border', tokens.colorBorder);
      root.style.setProperty('--color-text-primary', tokens.colorTextPrimary);
      root.style.setProperty('--color-text-secondary', tokens.colorTextSecondary);
      root.style.setProperty('--color-accent', tokens.colorAccent);
      root.style.setProperty('--color-accent-hover', tokens.colorAccentHover);
      root.style.setProperty('--color-danger', tokens.colorDanger);
      root.style.setProperty('--radius-card', tokens.radiusCard);
      root.style.setProperty('--radius-button', tokens.radiusButton);
      root.style.setProperty('--shadow-card', tokens.shadowCard);
    }
  }, [settings, themes]);

  // Inject custom CSS
  useEffect(() => {
    if (!settings?.custom_css) return;
    const id = 'flame-custom-css';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = settings.custom_css;
  }, [settings?.custom_css]);

  return <>{children}</>;
}
