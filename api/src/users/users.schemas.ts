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
  photoUrl: z.url().optional(),
});
export type UpsertProfile = z.infer<typeof upsertProfileSchema>;

export const usernameParamSchema = z.string().trim().min(1);

export const updatePreferencesSchema = z.object({
  showIdentityOnContent: z.boolean().optional(),
  showCountry: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  discoverable: z.boolean().optional(),
  allowConnectionRequests: z.boolean().optional(),
});
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;

export const setInterestsSchema = z.object({
  interestIds: z.array(z.uuid()).max(20),
});
export type SetInterests = z.infer<typeof setInterestsSchema>;
