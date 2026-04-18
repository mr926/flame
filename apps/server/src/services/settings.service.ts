import { db } from '../db/client.js';
import { settings } from '../db/schema.js';
import { type Settings, SettingsSchema } from '@flame-claude/shared';

const DEFAULTS: Settings = SettingsSchema.parse({});

export class SettingsService {
  async getAll(): Promise<Settings> {
    const rows = await db.select().from(settings);
    const merged: Record<string, unknown> = { ...DEFAULTS };
    for (const row of rows) {
      try {
        merged[row.key] = JSON.parse(row.value_json);
      } catch {
        // skip malformed rows
      }
    }
    return SettingsSchema.parse(merged);
  }

  async update(input: Partial<Settings>): Promise<Settings> {
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(input)) {
      await db
        .insert(settings)
        .values({ key, value_json: JSON.stringify(value), updated_at: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value_json: JSON.stringify(value), updated_at: now },
        });
    }
    return this.getAll();
  }
}

export const settingsService = new SettingsService();
