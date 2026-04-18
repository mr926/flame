import { z } from 'zod';

export const AppSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  description: z.string().max(1000).nullable(),
  icon_type: z.enum(['mdi', 'uploaded_file', 'remote_url']),
  icon_value: z.string().max(500).nullable(),
  is_public: z.boolean(),
  is_pinned: z.boolean(),
  sort_order: z.number().int(),
  source: z.enum(['manual', 'docker', 'kubernetes']),
  source_key: z.string().max(500).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateAppSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  description: z.string().max(1000).optional().nullable(),
  icon_type: z.enum(['mdi', 'uploaded_file', 'remote_url']).default('mdi'),
  icon_value: z.string().max(500).optional().nullable(),
  is_public: z.boolean().default(true),
  is_pinned: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export const UpdateAppSchema = CreateAppSchema.partial();

export const ReorderAppsSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export type App = z.infer<typeof AppSchema>;
export type CreateAppInput = z.infer<typeof CreateAppSchema>;
export type UpdateAppInput = z.infer<typeof UpdateAppSchema>;
export type ReorderAppsInput = z.infer<typeof ReorderAppsSchema>;
