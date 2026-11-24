import { api } from '@/lib/api';
import { MoodId } from '@/theme';

export type Thought = {
  id: string;
  text: string;
  mood: MoodId;
  createdAt: string;
};

export type Reply = {
  id: string;
  thoughtId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type ThoughtDetail = Thought & {
  authorId: string;
  isPublic: boolean;
  replies: Reply[];
  _count: { reactions: number };
};

export type ReactionType = 'heart' | 'relate' | 'beautiful' | 'thoughtful' | 'hug';
export type ReportTargetType = 'thought' | 'reply' | 'profile';

export function listThoughts(cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api.get<{ thoughts: Thought[]; nextCursor: string | null }>(`/thoughts${query}`);
}

export function createThought(input: { text: string; mood: MoodId; isPublic?: boolean }) {
  return api.post<Thought>('/thoughts', input);
}

export function getThought(id: string) {
  return api.get<ThoughtDetail>(`/thoughts/${id}`);
}

export function deleteThought(id: string) {
  return api.delete<void>(`/thoughts/${id}`);
}

export function toggleReaction(thoughtId: string, type: ReactionType) {
  return api.post<{ reacted: boolean }>(`/thoughts/${thoughtId}/reactions`, { type });
}

export function replyToThought(thoughtId: string, text: string) {
  return api.post<Reply>(`/thoughts/${thoughtId}/replies`, { text });
}

export function reportTarget(targetType: ReportTargetType, targetId: string, reason: string) {
  return api.post('/reports', { targetType, targetId, reason });
}
