import { db } from '../db/client.js';
import { bookmarks } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import type { CreateBookmarkInput, UpdateBookmarkInput } from '@flame-claude/shared';

export class BookmarksService {
  async findAll(isAdmin: boolean, categoryId?: number) {
    let rows = await db
      .select()
      .from(bookmarks)
      .orderBy(asc(bookmarks.sort_order), asc(bookmarks.name));
    if (categoryId !== undefined) rows = rows.filter((b) => b.category_id === categoryId);
    return isAdmin ? rows : rows.filter((b) => b.is_public);
  }

  async create(input: CreateBookmarkInput) {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(bookmarks)
      .values({ ...input, icon_value: input.icon_value ?? null, created_at: now, updated_at: now })
      .returning();
    return row!;
  }

  async update(id: number, input: UpdateBookmarkInput) {
    const now = new Date().toISOString();
    const [row] = await db
      .update(bookmarks)
      .set({ ...input, updated_at: now })
      .where(eq(bookmarks.id, id))
      .returning();
    if (!row) throw new Error('Bookmark not found');
    return row;
  }

  async delete(id: number) {
    await db.delete(bookmarks).where(eq(bookmarks.id, id));
  }

  async reorder(categoryId: number, ids: number[]) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(bookmarks)
          .set({ sort_order: i, updated_at: new Date().toISOString() })
          .where(eq(bookmarks.id, ids[i]!));
      }
    });
  }
}

export const bookmarksService = new BookmarksService();
