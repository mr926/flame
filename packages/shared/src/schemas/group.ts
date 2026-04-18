import { z } from 'zod';

export const GroupSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(255),
  sort_order: z.number().int().default(0),
});

export const UpdateGroupSchema = CreateGroupSchema.partial();

export const ReorderGroupsSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export type Group = z.infer<typeof GroupSchema>;
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
