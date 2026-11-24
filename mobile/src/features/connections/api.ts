import { api } from '@/lib/api';

export type ConnectionRequest = {
  id: string;
  senderId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  introMessage: string | null;
  createdAt: string;
};

export type Connection = {
  id: string;
  otherUserId: string;
  conversationId: string | null;
  createdAt: string;
};

export function sendConnectionRequest(recipientId: string, introMessage?: string) {
  return api.post<ConnectionRequest>('/connection-requests', { recipientId, introMessage });
}

export function listIncomingRequests() {
  return api.get<ConnectionRequest[]>('/connection-requests/incoming');
}

export function acceptRequest(requestId: string) {
  return api.post<Connection>(`/connection-requests/${requestId}/accept`);
}

export function declineRequest(requestId: string) {
  return api.post<void>(`/connection-requests/${requestId}/decline`);
}

export function listConnections() {
  return api.get<Connection[]>('/connections');
}

export function removeConnection(connectionId: string) {
  return api.delete<void>(`/connections/${connectionId}`);
}
