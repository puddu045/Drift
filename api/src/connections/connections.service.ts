import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { BlocksService } from '../blocks/blocks.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRequest } from './connections.schemas.js';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlocksService,
    private readonly notifications: NotificationsService,
  ) {}

  async sendRequest(senderId: string, data: CreateRequest) {
    const { recipientId, introMessage } = data;
    if (senderId === recipientId) throw new BadRequestException('Cannot connect with yourself');

    if (await this.blocks.isBlockedEitherWay(senderId, recipientId)) {
      throw new ForbiddenException('Cannot send a request to this user');
    }

    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId: recipientId } });
    if (preferences && !preferences.allowConnectionRequests) {
      throw new ForbiddenException('This user is not accepting connection requests');
    }

    const existingConnection = await this.prisma.connection.findFirst({
      where: {
        removedAt: null,
        OR: [
          { userAId: senderId, userBId: recipientId },
          { userAId: recipientId, userBId: senderId },
        ],
      },
    });
    if (existingConnection) throw new BadRequestException('Already connected');

    const priorDecline = await this.prisma.connectionRequest.findFirst({
      where: { senderId, recipientId, status: 'declined' },
    });
    if (priorDecline) throw new ForbiddenException('This user already declined a request from you');

    const existingPending = await this.prisma.connectionRequest.findFirst({
      where: {
        status: 'pending',
        OR: [
          { senderId, recipientId },
          { senderId: recipientId, recipientId: senderId },
        ],
      },
    });
    if (existingPending) throw new BadRequestException('A request is already pending between you two');

    const request = await this.prisma.connectionRequest.create({
      data: { senderId, recipientId, introMessage },
    });
    await this.notifications.create(recipientId, 'connection_request', { requestId: request.id, senderId });
    return request;
  }

  async listIncoming(userId: string) {
    const requests = await this.prisma.connectionRequest.findMany({
      where: { recipientId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { profile: { select: { displayName: true, photoUrl: true } } } } },
    });
    // Unlike anonymous thought/reply authorship, a connection request always
    // shows the sender's identity — you can't meaningfully decide whether to
    // accept a request from a total stranger with zero information.
    return requests.map(({ sender, ...request }) => ({ ...request, senderProfile: sender.profile }));
  }

  async listOutgoing(userId: string) {
    return this.prisma.connectionRequest.findMany({
      where: { senderId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getPendingRequest(requestId: string) {
    const request = await this.prisma.connectionRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'pending') throw new NotFoundException('Request not found');
    return request;
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.getPendingRequest(requestId);
    if (request.recipientId !== userId) throw new ForbiddenException('Not your request to accept');

    const { connection, conversation } = await this.prisma.$transaction(async (tx) => {
      await tx.connectionRequest.update({
        where: { id: requestId },
        data: { status: 'accepted', respondedAt: new Date() },
      });
      const newConnection = await tx.connection.create({
        data: { userAId: request.senderId, userBId: request.recipientId },
      });
      const newConversation = await tx.conversation.create({ data: { connectionId: newConnection.id } });
      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: newConversation.id, userId: request.senderId },
          { conversationId: newConversation.id, userId: request.recipientId },
        ],
      });
      return { connection: newConnection, conversation: newConversation };
    });

    await this.notifications.create(request.senderId, 'connection_accepted', {
      connectionId: connection.id,
      conversationId: conversation.id,
    });
    return connection;
  }

  async declineRequest(userId: string, requestId: string) {
    const request = await this.getPendingRequest(requestId);
    if (request.recipientId !== userId) throw new ForbiddenException('Not your request to decline');
    await this.prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: 'declined', respondedAt: new Date() },
    });
  }

  async withdrawRequest(userId: string, requestId: string) {
    const request = await this.getPendingRequest(requestId);
    if (request.senderId !== userId) throw new ForbiddenException('Not your request to withdraw');
    await this.prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: 'withdrawn', respondedAt: new Date() },
    });
  }

  async listConnections(userId: string) {
    const connections = await this.prisma.connection.findMany({
      where: { removedAt: null, OR: [{ userAId: userId }, { userBId: userId }] },
      include: { conversation: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const otherIds = connections.map((c) => (c.userAId === userId ? c.userBId : c.userAId));
    const blockRows = otherIds.length
      ? await this.prisma.block.findMany({
          where: {
            OR: [
              { blockerId: userId, blockedId: { in: otherIds } },
              { blockerId: { in: otherIds }, blockedId: userId },
            ],
          },
          select: { blockerId: true, blockedId: true },
        })
      : [];
    const blockedOtherIds = new Set(blockRows.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)));
    return connections.map((c) => {
      const otherUserId = c.userAId === userId ? c.userBId : c.userAId;
      return {
        id: c.id,
        otherUserId,
        conversationId: c.conversation?.id ?? null,
        createdAt: c.createdAt,
        // Either direction — a blocked chat stays visible (see
        // BlocksService.block) but greyed out and pushed to the bottom on
        // both ends, with sending disabled until unblocked.
        isBlocked: blockedOtherIds.has(otherUserId),
      };
    });
  }

  async removeConnection(userId: string, connectionId: string) {
    const connection = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection || connection.removedAt) throw new NotFoundException('Connection not found');
    if (connection.userAId !== userId && connection.userBId !== userId) {
      throw new ForbiddenException('Not your connection');
    }
    await this.prisma.connection.update({ where: { id: connectionId }, data: { removedAt: new Date() } });
  }
}
