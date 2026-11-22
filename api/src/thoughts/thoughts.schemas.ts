import { z } from 'zod';

export const moodSchema = z.enum([
  'love',
  'deep',
  'happy',
  'reflective',
  'hopeful',
  'random',
  'lonely',
  'curious',
]);

export const reactionTypeSchema = z.enum(['heart', 'relate', 'beautiful', 'thoughtful', 'hug']);

export const reactSchema = z.object({ type: reactionTypeSchema });
export type React = z.infer<typeof reactSchema>;

export const createThoughtSchema = z.object({
  text: z.string().trim().min(1).max(280),
  mood: moodSchema,
  isPublic: z.boolean().optional().default(true),
});
export type CreateThought = z.infer<typeof createThoughtSchema>;

export const createReplySchema = z.object({
  text: z.string().trim().min(1).max(280),
});
export type CreateReply = z.infer<typeof createReplySchema>;

export const reportTargetTypeSchema = z.enum(['thought', 'reply', 'profile']);

export const createReportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
});
export type CreateReport = z.infer<typeof createReportSchema>;

export const discoverQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;

export const idParamSchema = z.uuid();
