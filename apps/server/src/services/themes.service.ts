import { db } from '../db/client.js';
import { themes } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { CreateThemeInput, UpdateThemeInput, ThemeTokens } from '@flame-claude/shared';

const BUILTIN_THEMES: Array<{ name: string; tokens: ThemeTokens }> = [
  {
    name: 'Flame Light',
    tokens: {
      colorBackground: '#f5f5f5',
      colorSurface: '#ffffff',
      colorBorder: '#e0e0e0',
      colorTextPrimary: '#1a1a1a',
      colorTextSecondary: '#6b7280',
      colorAccent: '#ef4444',
      colorAccentHover: '#dc2626',
      colorDanger: '#ef4444',
      radiusCard: '0.75rem',
      radiusButton: '0.5rem',
      shadowCard: '0 1px 3px rgba(0,0,0,0.1)',
    },
  },
  {
    name: 'Flame Dark',
    tokens: {
      colorBackground: '#0f0f0f',
      colorSurface: '#1a1a1a',
      colorBorder: '#2a2a2a',
      colorTextPrimary: '#f5f5f5',
      colorTextSecondary: '#9ca3af',
      colorAccent: '#ef4444',
      colorAccentHover: '#dc2626',
      colorDanger: '#ef4444',
      radiusCard: '0.75rem',
      radiusButton: '0.5rem',
      shadowCard: '0 1px 3px rgba(0,0,0,0.4)',
    },
  },
  {
    name: 'Ocean',
    tokens: {
      colorBackground: '#0a192f',
      colorSurface: '#112240',
      colorBorder: '#1e3a5f',
      colorTextPrimary: '#ccd6f6',
      colorTextSecondary: '#8892b0',
      colorAccent: '#64ffda',
      colorAccentHover: '#4fd1b3',
      colorDanger: '#ff6b6b',
      radiusCard: '0.75rem',
      radiusButton: '0.5rem',
      shadowCard: '0 2px 8px rgba(0,0,0,0.5)',
    },
  },
  {
    name: 'Nord',
    tokens: {
      colorBackground: '#2e3440',
      colorSurface: '#3b4252',
      colorBorder: '#4c566a',
      colorTextPrimary: '#eceff4',
      colorTextSecondary: '#d8dee9',
      colorAccent: '#88c0d0',
      colorAccentHover: '#81a1c1',
      colorDanger: '#bf616a',
      radiusCard: '0.5rem',
      radiusButton: '0.375rem',
      shadowCard: '0 1px 4px rgba(0,0,0,0.3)',
    },
  },
];

export class ThemesService {
  async seedBuiltins() {
    const now = new Date().toISOString();
    for (const t of BUILTIN_THEMES) {
      const existing = await db
        .select()
        .from(themes)
        .where(eq(themes.name, t.name))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(themes).values({
          name: t.name,
          tokens_json: JSON.stringify(t.tokens),
          is_builtin: true,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  async findAll() {
    return db.select().from(themes);
  }

  async create(input: CreateThemeInput) {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(themes)
      .values({
        name: input.name,
        tokens_json: JSON.stringify(input.tokens),
        is_builtin: false,
        created_at: now,
        updated_at: now,
      })
      .returning();
    return row!;
  }

  async update(id: number, input: UpdateThemeInput) {
    const [existing] = await db.select().from(themes).where(eq(themes.id, id)).limit(1);
    if (!existing) throw new Error('Theme not found');
    if (existing.is_builtin) throw new Error('Cannot modify builtin theme');
    const currentTokens: ThemeTokens = JSON.parse(existing.tokens_json);
    const merged = { ...currentTokens, ...(input.tokens ?? {}) };
    const now = new Date().toISOString();
    const [row] = await db
      .update(themes)
      .set({ name: input.name ?? existing.name, tokens_json: JSON.stringify(merged), updated_at: now })
      .where(eq(themes.id, id))
      .returning();
    return row!;
  }

  async delete(id: number) {
    const [existing] = await db.select().from(themes).where(eq(themes.id, id)).limit(1);
    if (!existing) throw new Error('Theme not found');
    if (existing.is_builtin) throw new Error('Cannot delete builtin theme');
    await db.delete(themes).where(eq(themes.id, id));
  }
}

export const themesService = new ThemesService();
