import { db } from '../db/client.js';
import { pages, page_groups, categories, bookmarks, apps, groups } from '../db/schema.js';
import { eq, asc, inArray, isNull, count } from 'drizzle-orm';
import type { CreatePageInput, UpdatePageInput } from '@flame-claude/shared';

export class PagesService {
  private async hydrateGroupIds(pageIds: number[]): Promise<Map<number, number[]>> {
    const map = new Map<number, number[]>();
    for (const pid of pageIds) map.set(pid, []);
    if (pageIds.length === 0) return map;
    const rows = await db.select().from(page_groups).where(inArray(page_groups.page_id, pageIds));
    for (const r of rows) {
      map.get(r.page_id)?.push(r.group_id);
    }
    return map;
  }

  async findAll(isAdmin: boolean) {
    let rows = await db.select().from(pages).orderBy(asc(pages.sort_order), asc(pages.name));
    if (!isAdmin) rows = rows.filter((p) => p.is_public);
    const groupIdMap = await this.hydrateGroupIds(rows.map((p) => p.id));
    return rows.map((p) => ({ ...p, group_ids: groupIdMap.get(p.id) ?? [] }));
  }

  async findBySlug(slug: string, isAdmin: boolean) {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
    if (!page) return null;
    if (!isAdmin && !page.is_public) return null;

    const pgRows = await db.select().from(page_groups).where(eq(page_groups.page_id, page.id));
    const group_ids = pgRows.map((r) => r.group_id);

    let pageGroups: Array<{ id: number | null; name: string | null; categories: Array<{ id: number; name: string; sort_order: number; is_public: boolean; bookmarks: Array<{ id: number; name: string; url: string; icon_type: string; icon_value: string | null; is_public: boolean; sort_order: number }> }> }> = [];

    if (group_ids.length === 0) {
      // Show ungrouped categories flat (null group heading)
      const cats = await db.select().from(categories).where(isNull(categories.group_id)).orderBy(asc(categories.sort_order), asc(categories.name));
      const visibleCats = isAdmin ? cats : cats.filter((c) => c.is_public);
      const catIds = visibleCats.map((c) => c.id);
      const bms = catIds.length > 0 ? await db.select().from(bookmarks).where(inArray(bookmarks.category_id, catIds)).orderBy(asc(bookmarks.sort_order)) : [];
      pageGroups = [{
        id: null, name: null,
        categories: visibleCats.map((c) => ({
          ...c,
          bookmarks: bms.filter((b) => b.category_id === c.id && (isAdmin || b.is_public)),
        })),
      }];
    } else {
      const grpRows = await db.select().from(groups).where(inArray(groups.id, group_ids)).orderBy(asc(groups.sort_order));
      const cats = await db.select().from(categories).where(inArray(categories.group_id, group_ids)).orderBy(asc(categories.sort_order), asc(categories.name));
      const visibleCats = isAdmin ? cats : cats.filter((c) => c.is_public);
      const catIds = visibleCats.map((c) => c.id);
      const bms = catIds.length > 0 ? await db.select().from(bookmarks).where(inArray(bookmarks.category_id, catIds)).orderBy(asc(bookmarks.sort_order)) : [];

      pageGroups = grpRows.map((g) => {
        const gCats = visibleCats.filter((c) => c.group_id === g.id);
        return {
          id: g.id, name: g.name,
          categories: gCats.map((c) => ({
            ...c,
            bookmarks: bms.filter((b) => b.category_id === c.id && (isAdmin || b.is_public)),
          })),
        };
      });
    }

    const appsData = page.show_apps
      ? (await db.select().from(apps).orderBy(asc(apps.sort_order), asc(apps.name))).filter((a) => isAdmin || a.is_public)
      : [];

    return { ...page, group_ids, groups: pageGroups, apps: appsData };
  }

  async create(input: CreatePageInput) {
    const now = new Date().toISOString();
    const { group_ids, ...pageData } = input;
    const [{ total }] = await db.select({ total: count() }).from(pages);
    const sort_order = total ?? 0;
    const [row] = await db.insert(pages).values({ ...pageData, sort_order, created_at: now, updated_at: now }).returning();
    if (!row) throw new Error('Insert failed');
    if (group_ids.length > 0) {
      await db.insert(page_groups).values(group_ids.map((gid) => ({ page_id: row.id, group_id: gid })));
    }
    return { ...row, group_ids };
  }

  async update(id: number, input: UpdatePageInput) {
    const now = new Date().toISOString();
    const { group_ids, ...pageData } = input;
    const [row] = await db.update(pages).set({ ...pageData, updated_at: now }).where(eq(pages.id, id)).returning();
    if (!row) throw new Error('Page not found');
    if (group_ids !== undefined) {
      await db.delete(page_groups).where(eq(page_groups.page_id, id));
      if (group_ids.length > 0) {
        await db.insert(page_groups).values(group_ids.map((gid) => ({ page_id: id, group_id: gid })));
      }
    }
    const finalGroupIds = group_ids ?? (await db.select().from(page_groups).where(eq(page_groups.page_id, id))).map((r) => r.group_id);
    return { ...row, group_ids: finalGroupIds };
  }

  async delete(id: number) {
    await db.delete(pages).where(eq(pages.id, id));
  }

  async reorder(ids: number[]) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(pages).set({ sort_order: i, updated_at: new Date().toISOString() }).where(eq(pages.id, ids[i]!));
      }
    });
  }
}

export const pagesService = new PagesService();
