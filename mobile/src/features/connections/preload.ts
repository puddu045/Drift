import { Image } from 'react-native';
import { listConversations } from '@/features/messages/api';
import { listNotifications } from '@/features/notifications/api';
import { getPublicProfile, PublicProfile } from '@/features/profile/api';
import { getCached, setCached } from '@/lib/prefetchCache';
import { listConnections, listIncomingRequests } from './api';

function warmPhoto(url?: string | null) {
  if (url) void Image.prefetch(url).catch(() => {});
}

// Lets the tab bar's unread-messages badge (see (tabs)/_layout.tsx) react to
// a freshly fetched inbox without polling — the same small external-store
// pattern as i18n/localeStore.ts.
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeInbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function fetchInbox(userId: string) {
  const previous = cachedInbox(userId);
  const [requests, people, conversations, notifications] = await Promise.all([
    listIncomingRequests().then(items => {
      items.forEach(item => warmPhoto(item.senderProfile?.photoUrl));
      return items;
    }),
    listConnections().then(async connections => {
      const profiles: Record<string, PublicProfile> = { ...previous?.profiles };
      await Promise.all(connections.map(async connection => {
        const profile = await getPublicProfile(connection.otherUserId).catch(() => undefined);
        if (profile) {
          profiles[connection.otherUserId] = profile;
          warmPhoto(profile.photoUrl);
        }
      }));
      return { connections, profiles };
    }),
    listConversations().catch(() => undefined),
    listNotifications().catch(() => undefined),
  ]);
  const summaries = conversations ? Object.fromEntries(conversations.map(c => [c.conversationId, c])) : previous?.summaries ?? {};
  const badges: Record<string, number> = notifications ? {} : previous?.badges ?? {};
  for (const item of notifications ?? []) {
    const id = item.payload.conversationId;
    if (item.type === 'message' && !item.readAt && typeof id === 'string') badges[id] = (badges[id] ?? 0) + 1;
  }
  return { ...people, requests, summaries, badges };
}

type Inbox = {
  requests: Awaited<ReturnType<typeof listIncomingRequests>>;
  connections: Awaited<ReturnType<typeof listConnections>>;
  profiles: Record<string, PublicProfile>;
  summaries: Record<string, Awaited<ReturnType<typeof listConversations>>[number]>;
  badges: Record<string, number>;
};
const pending = new Map<string, Promise<Inbox>>();
export function cachedInbox(userId: string): Inbox | undefined {
  return getCached<Inbox>('inbox:' + userId);
}

export function preloadInbox(userId: string, force = false): Promise<Inbox> {
  const running = pending.get(userId);
  if (running && !force) return running;
  const request = fetchInbox(userId).then(data => {
    if (pending.get(userId) === request) {
      setCached('inbox:' + userId, data);
      listeners.forEach(listener => listener());
    }
    return data;
  }).finally(() => {
    if (pending.get(userId) === request) pending.delete(userId);
  });
  pending.set(userId, request);
  return request;
}
