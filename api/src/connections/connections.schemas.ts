import { z } from 'zod';

export const createRequestSchema = z.object({
  recipientId: z.uuid(),
  introMessage: z.string().trim().min(1).max(280).optional(),
});
export type CreateRequest = z.infer<typeof createRequestSchema>;

export const idParamSchema = z.uuid();
