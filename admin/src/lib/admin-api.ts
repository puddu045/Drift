import { api } from './api';

export type AdminUser = {
  id: string;
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  createdAt: string;
  profile: { displayName: string; username: string } | null;
};

export function listUsers(params: { search?: string; cursor?: string }) {
  return api.get<{ users: AdminUser[]; nextCursor: string | null }>('/admin/users', {
    search: params.search,
    cursor: params.cursor,
  });
}

export function setUserStatus(userId: string, status: 'active' | 'suspended' | 'banned') {
  return api.patch<AdminUser>(`/admin/users/${userId}/status`, { status });
}

export type AdminReport = {
  id: string;
  reporterId: string;
  targetType: 'thought' | 'reply' | 'message' | 'profile';
  thoughtId: string | null;
  replyId: string | null;
  messageId: string | null;
  reportedUserId: string | null;
  reason: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  thought: { id: string; text: string; authorId: string; deletedAt: string | null } | null;
  reply: { id: string; text: string; authorId: string; deletedAt: string | null } | null;
  message: { id: string; text: string; senderId: string; deletedAt: string | null } | null;
};

export function listReports(params: { status?: string; cursor?: string }) {
  return api.get<{ reports: AdminReport[]; nextCursor: string | null }>('/admin/reports', {
    status: params.status,
    cursor: params.cursor,
  });
}

export type ModerationActionType = 'content_removed' | 'warning' | 'suspended' | 'banned' | 'dismissed';

export function resolveReport(reportId: string, action: ModerationActionType, notes?: string) {
  return api.post<void>(`/admin/reports/${reportId}/resolve`, { action, notes });
}

export type AuditLogEntry = {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
};

export function listAuditLog(params: { cursor?: string }) {
  return api.get<{ entries: AuditLogEntry[]; nextCursor: string | null }>('/admin/audit-log', {
    cursor: params.cursor,
  });
}

export type FeatureFlag = { key: string; enabled: boolean; payload: unknown; updatedAt: string };

export function listFeatureFlags() {
  return api.get<FeatureFlag[]>('/admin/feature-flags');
}

export function setFeatureFlag(key: string, enabled: boolean) {
  return api.put<FeatureFlag>(`/admin/feature-flags/${key}`, { enabled });
}

export function deleteFeatureFlag(key: string) {
  return api.delete<void>(`/admin/feature-flags/${key}`);
}

export type DashboardStats = {
  totalUsers: number;
  suspendedOrBannedUsers: number;
  totalThoughts: number;
  openReports: number;
  totalReports: number;
};

export function getDashboardStats() {
  return api.get<DashboardStats>('/admin/dashboard');
}
