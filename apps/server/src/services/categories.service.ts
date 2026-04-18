import { db } from '../db/client.js';
import { categories } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import type { CreateCategoryInput, UpdateCategoryInput } from '@flame-claude/shared';

export class CategoriesService {
  async findAll(isAdmin: boolean) {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sort_order), asc(categories.name));
    return isAdmin ? rows : rows.filter((c) => c.is_public);
  }

  async create(input: CreateCategoryInput) {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(categories)
      .values({ ...input, created_at: now, updated_at: now })
      .returning();
    return row!;
  }

  async update(id: number, input: UpdateCategoryInput) {
    const now = new Date().toISOString();
    const [row] = await db
      .update(categories)
      .set({ ...input, updated_at: now })
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw new Error('Category not found');
    return row;
  }

  async delete(id: number) {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async reorder(ids: number[]) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(categories)
          .set({ sort_order: i, updated_at: new Date().toISOString() })
          .where(eq(categories.id, ids[i]!));
      }
    });
  }
}

export const categoriesService = new CategoriesService();
