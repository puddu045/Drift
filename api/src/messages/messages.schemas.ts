import { z } from 'zod';

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});
export type SendMessage = z.infer<typeof sendMessageSchema>;

export const idParamSchema = z.uuid();

export const messagesQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
