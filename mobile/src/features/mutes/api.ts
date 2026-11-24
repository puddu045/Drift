import { api } from '@/lib/api';

export type Mute = { mutedId: string; createdAt: string };

export function muteUser(userId: string) {
  return api.post<void>('/mutes', { userId });
}

export function unmuteUser(userId: string) {
  return api.delete<void>(`/mutes/${userId}`);
}

export function listMuted() {
  return api.get<Mute[]>('/mutes');
}
