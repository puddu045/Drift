import { z } from 'zod';

export const blockUserSchema = z.object({ userId: z.uuid() });
export type BlockUser = z.infer<typeof blockUserSchema>;
