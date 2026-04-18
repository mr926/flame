import { db } from '../db/client.js';
import { apps } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import type { CreateAppInput, UpdateAppInput } from '@flame-claude/shared';

export class AppsService {
  async findAll(isAdmin: boolean) {
    const rows = await db
      .select()
      .from(apps)
      .orderBy(asc(apps.sort_order), asc(apps.name));
    return isAdmin ? rows : rows.filter((r) => r.is_public);
  }

  async create(input: CreateAppInput) {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(apps)
      .values({
        name: input.name,
        url: input.url,
        description: input.description ?? null,
        icon_type: input.icon_type ?? 'mdi',
        icon_value: input.icon_value ?? null,
        is_public: input.is_public ?? true,
        is_pinned: input.is_pinned ?? false,
        sort_order: input.sort_order ?? 0,
        source: 'manual',
        source_key: null,
        created_at: now,
        updated_at: now,
      })
      .returning();
    return row!;
  }

  async update(id: number, input: UpdateAppInput) {
    const now = new Date().toISOString();
    const [row] = await db
      .update(apps)
      .set({ ...input, updated_at: now })
      .where(eq(apps.id, id))
      .returning();
    if (!row) throw new Error('App not found');
    return row;
  }

  async delete(id: number) {
    await db.delete(apps).where(eq(apps.id, id));
  }

  async reorder(ids: number[]) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(apps)
          .set({ sort_order: i, updated_at: new Date().toISOString() })
          .where(eq(apps.id, ids[i]!));
      }
    });
  }

  async upsertFromSync(
    source: 'docker' | 'kubernetes',
    sourceKey: string,
    data: { name: string; url: string; icon_value?: string },
    opts: { name: boolean; url: boolean; icon: boolean; unpinStopped: boolean },
    isRunning: boolean,
  ) {
    const now = new Date().toISOString();
    const existing = await db
      .select()
      .from(apps)
      .where(eq(apps.source_key, sourceKey))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(apps).values({
        name: data.name,
        url: data.url,
        icon_type: 'mdi',
        icon_value: data.icon_value ?? null,
        is_public: true,
        is_pinned: true,
        sort_order: 0,
        source,
        source_key: sourceKey,
        description: null,
        created_at: now,
        updated_at: now,
      });
    } else {
      const upd: Partial<typeof apps.$inferInsert> = { updated_at: now };
      if (opts.name) upd.name = data.name;
      if (opts.url) upd.url = data.url;
      if (opts.icon && data.icon_value) upd.icon_value = data.icon_value;
      if (opts.unpinStopped && !isRunning) upd.is_pinned = false;
      await db.update(apps).set(upd).where(eq(apps.source_key, sourceKey));
    }
  }
}

export const appsService = new AppsService();
