import { z } from 'zod';

export const SetupSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, _ and - allowed'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(64),
  password: z.string().min(1).max(128),
});

export const SessionSchema = z.object({
  authenticated: z.boolean(),
  setupRequired: z.boolean(),
});

export type SetupInput = z.infer<typeof SetupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SessionInfo = z.infer<typeof SessionSchema>;
