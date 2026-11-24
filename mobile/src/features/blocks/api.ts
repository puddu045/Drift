import { api } from '@/lib/api';

export function blockUser(userId: string) {
  return api.post<void>('/blocks', { userId });
}

export function unblockUser(userId: string) {
  return api.delete<void>(`/blocks/${userId}`);
}
