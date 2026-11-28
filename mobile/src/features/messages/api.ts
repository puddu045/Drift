import { api } from '@/lib/api';

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type ConversationSummary = {
  conversationId: string;
  otherUserId: string | null;
  lastMessage: Message | null;
};

export function listConversations() {
  return api.get<ConversationSummary[]>('/conversations');
}

export function listMessages(conversationId: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api.get<{ messages: Message[]; nextCursor: string | null }>(
    `/conversations/${conversationId}/messages${query}`,
  );
}

export function sendMessage(conversationId: string, text: string) {
  return api.post<Message>(`/conversations/${conversationId}/messages`, { text });
}

export type Translation = { translatedText: string; language: string };

/** On-demand only — never called automatically, just from a "Translate" tap. */
export function translateMessage(conversationId: string, messageId: string) {
  return api.post<Translation>(`/conversations/${conversationId}/messages/${messageId}/translate`);
}
