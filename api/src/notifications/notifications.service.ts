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

const PUSH_BODY: Record<NotificationType, string> = {
  reaction: 'Someone reacted to your thought.',
  reply: 'Someone replied to your thought.',
  connection_request: 'You have a new connection request.',
  connection_accepted: 'Your connection request was accepted.',
  message: 'You have a new message.',
  destiny_ready: 'Your daily Destiny thought is ready.',
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

  async list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }
}
