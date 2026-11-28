import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma.service.js';

type NotificationType =
  | 'reaction'
  | 'reply'
  | 'connection_request'
  | 'connection_accepted'
  | 'message'
  | 'destiny_ready';

// Types whose rows sharing the same thoughtId get collapsed into one
// "<name> and others reacted/replied to your thought" item in the tray,
// rather than one row per event.
const GROUPABLE_TYPES = new Set<NotificationType>(['reaction', 'reply']);

const PUSH_BODY: Record<NotificationType, string> = {
  reaction: 'Someone reacted to your thought.',
  reply: 'Someone replied to your thought.',
  connection_request: 'You have a new connection request.',
  connection_accepted: 'Your connection request was accepted.',
  message: 'You have a new message.',
  destiny_ready: 'Your daily Destiny thought is ready.',
};

export type NotificationGroup = {
  id: string;
  type: NotificationType;
  // Every raw notification row folded into this group — marking the group
  // read marks all of them.
  groupIds: string[];
  // Most recent actor's display name for a grouped reaction/reply, if their
  // identity is visible to this viewer (same reveal rule as thought/reply
  // authorship) — null if anonymous or not applicable to this type.
  lastActorName: string | null;
  // How many more distinct events are folded into this group beyond the
  // most recent one (0 for a single, ungrouped notification).
  extraCount: number;
  payload: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Internal helper other services call — never exposed directly as a route. */
  async create(userId: string, type: NotificationType, payload: Prisma.InputJsonValue) {
    await this.prisma.notification.create({ data: { userId, type, payload } });
    await this.sendPushBestEffort(userId, type, payload);
  }

  /**
   * Fire-and-forget push via Expo's push service. Never throws — a failed or
   * slow push should never break the action that triggered the notification.
   * No mobile device-token registration flow is wired up yet (Phase 3 scope
   * cut), so this currently has no tokens to send to in practice.
   */
  private async sendPushBestEffort(userId: string, type: NotificationType, data: Prisma.InputJsonValue) {
    try {
      const tokens = await this.prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
      if (tokens.length === 0) return;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          tokens.map((t) => ({ to: t.token, title: 'Unwritten', body: PUSH_BODY[type], data })),
        ),
      });
    } catch {
      // Best-effort only.
    }
  }

  /**
   * Who reacted/replied, resolved the same way thought/reply authorship is —
   * only surfaced once the actor has opted to reveal their identity
   * (UserPreferences.showIdentityOnContent), otherwise they stay anonymous
   * here too. One query for every actor across the whole page, not per row.
   */
  private async resolveActorNames(actorIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(actorIds)];
    if (uniqueIds.length === 0) return new Map();
    const revealed = await this.prisma.userPreferences.findMany({
      where: { userId: { in: uniqueIds }, showIdentityOnContent: true },
      select: { userId: true },
    });
    if (revealed.length === 0) return new Map();
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: revealed.map((r) => r.userId) } },
      select: { userId: true, displayName: true },
    });
    return new Map(profiles.map((p) => [p.userId, p.displayName]));
  }

  async list(userId: string): Promise<NotificationGroup[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const actorIds = rows
      .filter((row) => GROUPABLE_TYPES.has(row.type as NotificationType))
      .map((row) => (row.payload as Record<string, unknown> | null)?.actorId)
      .filter((id): id is string => typeof id === 'string');
    const actorNames = await this.resolveActorNames(actorIds);

    const groups = new Map<string, NotificationGroup>();
    const ordered: NotificationGroup[] = [];

    for (const row of rows) {
      const type = row.type as NotificationType;
      const payload = row.payload as Record<string, unknown> | null;
      const thoughtId = payload?.thoughtId;
      const groupKey =
        GROUPABLE_TYPES.has(type) && typeof thoughtId === 'string' ? `${type}:${thoughtId}` : `solo:${row.id}`;

      const existing = groups.get(groupKey);
      if (existing) {
        existing.groupIds.push(row.id);
        existing.extraCount += 1;
        if (!row.readAt) existing.readAt = null;
        continue;
      }

      const actorId = typeof payload?.actorId === 'string' ? payload.actorId : undefined;
      const group: NotificationGroup = {
        id: row.id,
        type,
        groupIds: [row.id],
        lastActorName: actorId ? (actorNames.get(actorId) ?? null) : null,
        extraCount: 0,
        payload: row.payload,
        readAt: row.readAt,
        createdAt: row.createdAt,
      };
      groups.set(groupKey, group);
      ordered.push(group);
    }

    return ordered;
  }

  async markRead(userId: string, notificationIds: string[]) {
    if (notificationIds.length === 0) return;
    await this.prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: { readAt: new Date() },
    });
  }

  /** Clears the per-conversation unread badge once its messages are viewed —
   * 'message' notifications never show in the tray, but still back that
   * badge, so they still need their own readAt cleared. */
  async markConversationRead(userId: string, conversationId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        type: 'message',
        readAt: null,
        payload: { path: ['conversationId'], equals: conversationId },
      },
      data: { readAt: new Date() },
    });
  }
}
