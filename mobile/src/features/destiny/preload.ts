import { Image } from 'react-native';

import { getThought, Thought, ThoughtDetail } from '@/features/thoughts/api';
import { getCached, setCached } from '@/lib/prefetchCache';
import { getTodayDestiny } from './api';

type DestinyPreview = { thought: Thought; author: ThoughtDetail['author'] };
const pending = new Map<string, Promise<DestinyPreview>>();
const keyFor = (userId: string) => 'destiny:' + userId + ':' + new Date().toISOString().slice(0, 10);

export function cachedDestiny(userId: string) {
  return getCached<DestinyPreview>(keyFor(userId));
}

export function preloadDestiny(userId: string) {
  const key = keyFor(userId);
  const running = pending.get(key);
  if (running) return running;
  const request = getTodayDestiny().then(async thought => {
    const previous = getCached<DestinyPreview>(key);
    let author = previous?.thought.id === thought.id ? previous.author : null;
    try {
      author = (await getThought(thought.id)).author;
    } catch {
      // The daily quote remains available if its byline cannot be refreshed.
    }
    if (author?.photoUrl) void Image.prefetch(author.photoUrl).catch(() => {});
    const preview = { thought, author };
    setCached(key, preview);
    return preview;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
