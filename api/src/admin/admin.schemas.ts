import { z } from 'zod';

export const idParamSchema = z.uuid();

export const adminUserStatusSchema = z.enum(['active', 'suspended', 'banned']);
export const setUserStatusSchema = z.object({ status: adminUserStatusSchema });
export type SetUserStatus = z.infer<typeof setUserStatusSchema>;

export const listUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const moderationActionTypeSchema = z.enum([
  'content_removed',
  'warning',
  'suspended',
  'banned',
  'dismissed',
]);

export const resolveReportSchema = z.object({
  action: moderationActionTypeSchema,
  notes: z.string().trim().max(1000).optional(),
});
export type ResolveReport = z.infer<typeof resolveReportSchema>;

export const reportStatusSchema = z.enum(['open', 'reviewing', 'resolved', 'dismissed']);
export const listReportsQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export const listAuditLogQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;

export const featureFlagKeyParamSchema = z.string().trim().min(1).max(100);

export const setFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  payload: z.json().optional(),
});
export type SetFeatureFlag = z.infer<typeof setFeatureFlagSchema>;
