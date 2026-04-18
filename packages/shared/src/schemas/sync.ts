import { z } from 'zod';

export const SyncRunSchema = z.object({
  id: z.number().int().positive(),
  source: z.enum(['docker', 'kubernetes']),
  status: z.enum(['running', 'success', 'error']),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  meta_json: z.string().nullable(),
});

export const IntegrationStatusSchema = z.object({
  docker: z.object({
    enabled: z.boolean(),
    lastRun: SyncRunSchema.nullable(),
  }),
  kubernetes: z.object({
    enabled: z.boolean(),
    lastRun: SyncRunSchema.nullable(),
  }),
});

export type SyncRun = z.infer<typeof SyncRunSchema>;
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;
