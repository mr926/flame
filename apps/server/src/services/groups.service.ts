import { db } from '../db/client.js';
import { groups } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import type { CreateGroupInput, UpdateGroupInput } from '@flame-claude/shared';

export class GroupsService {
  async findAll() {
    return db.select().from(groups).orderBy(asc(groups.sort_order), asc(groups.name));
  }

  async create(input: CreateGroupInput) {
    const now = new Date().toISOString();
    const [row] = await db.insert(groups).values({ ...input, created_at: now, updated_at: now }).returning();
    return row!;
  }

  async update(id: number, input: UpdateGroupInput) {
    const now = new Date().toISOString();
    const [row] = await db.update(groups).set({ ...input, updated_at: now }).where(eq(groups.id, id)).returning();
    if (!row) throw new Error('Group not found');
    return row;
  }

  async delete(id: number) {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async reorder(ids: number[]) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(groups).set({ sort_order: i, updated_at: new Date().toISOString() }).where(eq(groups.id, ids[i]!));
      }
    });
  }
}

export const groupsService = new GroupsService();
