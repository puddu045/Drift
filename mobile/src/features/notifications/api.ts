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
  // Every raw notification row folded into this item — mark-read needs all
  // of them, not just `id`.
  groupIds: string[];
  // Most recent reactor/replier's name, when they've opted to reveal their
  // identity — null if anonymous or not a reaction/reply.
  lastActorName: string | null;
  // How many more events (beyond the most recent one) are folded in here.
  extraCount: number;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export function listNotifications() {
  return api.get<Notification[]>('/notifications');
}

export function markNotificationsRead(ids: string[]) {
  return api.patch<void>('/notifications/read', { ids });
}
