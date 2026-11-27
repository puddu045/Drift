import { api } from '@/lib/api';
import { MoodId } from '@/theme';

export type Thought = {
  id: string;
  text: string;
  mood: MoodId;
  createdAt: string;
};

export type AuthorIdentity = { displayName: string; photoUrl: string | null } | null;

export type Reply = {
  id: string;
  thoughtId: string;
  // Omitted by the backend for anonymous authors — never compare this
  // directly to the viewer's id; use the sibling isOwnReply-style checks
  // the backend already resolves, or treat a missing author as "not mine".
  authorId?: string;
  text: string;
  createdAt: string;
  author: AuthorIdentity;
};

export type ThoughtDetail = Thought & {
  authorId?: string;
  isPublic: boolean;
  isOwnThought: boolean;
  replies: Reply[];
  _count: { reactions: number };
  author: AuthorIdentity;
};

export type ReactionType = 'heart' | 'relate' | 'beautiful' | 'thoughtful' | 'hug';
export type ReportTargetType = 'thought' | 'reply' | 'profile' | 'message';

export function listThoughts(cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api.get<{ thoughts: Thought[]; nextCursor: string | null }>(`/thoughts${query}`);
}

/** Everything the caller has posted themselves — never part of the Universe feed. */
export function listMyThoughts() {
  return api.get<Thought[]>('/thoughts/mine');
}

/** Other people's thoughts the caller has reacted to or replied on. */
export function listInteractions() {
  return api.get<Thought[]>('/thoughts/interactions');
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

export type Translation = { translatedText: string; language: string };

/** On-demand only — never called automatically, just from a "Translate" tap. */
export function translateThought(thoughtId: string) {
  return api.post<Translation>(`/thoughts/${thoughtId}/translate`);
}

export function translateReply(thoughtId: string, replyId: string) {
  return api.post<Translation>(`/thoughts/${thoughtId}/replies/${replyId}/translate`);
}
