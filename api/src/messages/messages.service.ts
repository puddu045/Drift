import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MessagesQuery } from './messages.schemas.js';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async requireActiveParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: { include: { connection: true } } },
    });
    if (!participant) throw new NotFoundException('Conversation not found');
    if (participant.conversation.connection.removedAt) {
      throw new ForbiddenException('This connection has been removed');
    }
    return participant;
  }

  async listConversations(userId: string) {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId, conversation: { connection: { removedAt: null } } },
      include: {
        conversation: {
          include: {
            participants: { where: { userId: { not: userId } }, select: { userId: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    return participations.map((p) => ({
      conversationId: p.conversationId,
      otherUserId: p.conversation.participants[0]?.userId ?? null,
      lastMessage: p.conversation.messages[0] ?? null,
    }));
  }

  async listMessages(userId: string, conversationId: string, query: MessagesQuery) {
    await this.requireActiveParticipant(userId, conversationId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const nextCursor = messages.length === query.limit ? messages[messages.length - 1].id : null;
    return { messages, nextCursor };
  }

  async sendMessage(userId: string, conversationId: string, text: string) {
    await this.requireActiveParticipant(userId, conversationId);
    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, text, deliveredAt: new Date() },
    });

    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    if (other) {
      await this.notifications.create(other.userId, 'message', { conversationId, messageId: message.id });
    }
    return message;
  }
}
