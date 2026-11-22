import { z } from 'zod';

export const relationshipIntentSchema = z.enum(['friendship', 'romance', 'open', 'just_sharing']);

export const upsertProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only'),
  bio: z.string().trim().max(280).optional(),
  country: z.string().trim().length(2).optional(),
  relationshipIntent: relationshipIntentSchema.optional(),
});
export type UpsertProfile = z.infer<typeof upsertProfileSchema>;

export const usernameParamSchema = z.string().trim().min(1);
