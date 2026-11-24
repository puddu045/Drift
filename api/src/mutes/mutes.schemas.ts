import { z } from 'zod';

export const muteUserSchema = z.object({ userId: z.uuid() });
export type MuteUser = z.infer<typeof muteUserSchema>;
