import { z } from 'zod';

export const BookmarkSchema = z.object({
  id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  icon_type: z.enum(['mdi', 'uploaded_file', 'remote_url']),
  icon_value: z.string().max(500).nullable(),
  is_public: z.boolean(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateBookmarkSchema = z.object({
  category_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  icon_type: z.enum(['mdi', 'uploaded_file', 'remote_url']).default('mdi'),
  icon_value: z.string().max(500).optional().nullable(),
  is_public: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const UpdateBookmarkSchema = CreateBookmarkSchema.partial();

export const ReorderBookmarksSchema = z.object({
  category_id: z.number().int().positive(),
  ids: z.array(z.number().int().positive()),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;
