import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { dailyTranslateLimit, TranslationService } from '../translation/translation.service.js';
import { MessagesQuery } from './messages.schemas.js';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly translation: TranslationService,
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
            messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 },
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

  /** On-demand only — never called automatically, just from a "Translate" tap. */
  async translateMessage(viewerId: string, conversationId: string, messageId: string) {
    await this.requireActiveParticipant(viewerId, conversationId);
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, text: true, deletedAt: true },
    });
    if (!message || message.deletedAt || message.conversationId !== conversationId) {
      throw new NotFoundException('Message not found');
    }

    const preferredLanguage = await this.translation.getPreferredLanguage(viewerId);
    if (!preferredLanguage) {
      throw new BadRequestException('Set a preferred language in your profile before translating.');
    }

    if (!(await this.translation.reserveDailyQuota(viewerId, 'message', message.id))) {
      throw new ForbiddenException(
        `You can translate up to ${dailyTranslateLimit()} items per day. Try again tomorrow.`,
      );
    }

    const [translatedText] = await this.translation.translateBatch([message.text], preferredLanguage, [
      { type: 'message', id: message.id },
    ]);
    return { translatedText, language: preferredLanguage };
  }
}
