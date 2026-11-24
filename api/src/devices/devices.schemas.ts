import { z } from 'zod';

export const registerDeviceSchema = z.object({
  token: z.string().trim().min(1),
  platform: z.enum(['ios', 'android']),
});
export type RegisterDevice = z.infer<typeof registerDeviceSchema>;

export const tokenParamSchema = z.string().trim().min(1);
