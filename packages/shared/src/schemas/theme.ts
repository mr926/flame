import { z } from 'zod';

export const ThemeTokensSchema = z.object({
  colorBackground: z.string(),
  colorSurface: z.string(),
  colorBorder: z.string(),
  colorTextPrimary: z.string(),
  colorTextSecondary: z.string(),
  colorAccent: z.string(),
  colorAccentHover: z.string(),
  colorDanger: z.string(),
  radiusCard: z.string(),
  radiusButton: z.string(),
  shadowCard: z.string(),
});

export const ThemeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  tokens_json: z.string(),
  is_builtin: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateThemeSchema = z.object({
  name: z.string().min(1).max(100),
  tokens: ThemeTokensSchema,
});

export const UpdateThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tokens: ThemeTokensSchema.partial().optional(),
});

export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type CreateThemeInput = z.infer<typeof CreateThemeSchema>;
export type UpdateThemeInput = z.infer<typeof UpdateThemeSchema>;
