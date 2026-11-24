import { api } from '@/lib/api';

export type NotificationType =
  | 'reaction'
  | 'reply'
  | 'connection_request'
  | 'connection_accepted'
  | 'message'
  | 'destiny_ready';

export type Notification = {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export function listNotifications() {
  return api.get<Notification[]>('/notifications');
}

export function markNotificationRead(id: string) {
  return api.patch<void>(`/notifications/${id}/read`);
}
