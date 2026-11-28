import { api } from '@/lib/api';

export type Block = { blockedId: string; createdAt: string };

export function blockUser(userId: string) {
  return api.post<void>('/blocks', { userId });
}

export function unblockUser(userId: string) {
  return api.delete<void>(`/blocks/${userId}`);
}

export function listBlocked() {
  return api.get<Block[]>('/blocks');
}
