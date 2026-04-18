import { z } from 'zod';

export const SettingsSchema = z.object({
  // General
  site_title: z.string().min(1).max(100).default('Flame'),
  apps_open_in_new_tab: z.boolean().default(true),
  bookmarks_open_in_new_tab: z.boolean().default(true),
  default_sort_order: z
    .enum(['name_asc', 'name_desc', 'created_asc', 'created_desc', 'custom'])
    .default('custom'),
  default_app_pinned: z.boolean().default(true),
  default_category_pinned: z.boolean().default(true),
  // Appearance
  active_theme_id: z.number().int().nullable().default(null),
  custom_css: z.string().default(''),
  // Docker integration
  docker_enabled: z.boolean().default(false),
  docker_host: z.string().default('unix:///var/run/docker.sock'),
  docker_overwrite_name: z.boolean().default(false),
  docker_overwrite_url: z.boolean().default(false),
  docker_overwrite_icon: z.boolean().default(false),
  docker_unpin_stopped: z.boolean().default(true),
  // Kubernetes integration
  kubernetes_enabled: z.boolean().default(false),
  kubernetes_overwrite_name: z.boolean().default(false),
  kubernetes_overwrite_url: z.boolean().default(false),
  kubernetes_overwrite_icon: z.boolean().default(false),
  kubernetes_unpin_stopped: z.boolean().default(true),
});

export const UpdateSettingsSchema = SettingsSchema.partial();

export type Settings = z.infer<typeof SettingsSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
