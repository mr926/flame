import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  group_id: z.number().int().positive().nullable(),
  is_public: z.boolean(),
  is_pinned: z.boolean(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  group_id: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().default(true),
  is_pinned: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const ReorderCategoriesSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
