import { z } from 'zod';

export const PageSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  is_public: z.boolean(),
  show_apps: z.boolean(),
  sort_order: z.number().int(),
  group_ids: z.array(z.number().int().positive()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreatePageSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  is_public: z.boolean().default(true),
  show_apps: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  group_ids: z.array(z.number().int().positive()).default([]),
});

export const UpdatePageSchema = CreatePageSchema.partial();

export const ReorderPagesSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export type Page = z.infer<typeof PageSchema>;
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
