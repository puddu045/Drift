import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');
    // Deliberately does NOT remove any existing Connection — a blocked
    // connection stays visible (greyed out, pushed to the bottom) to whoever
    // blocked, with its message history intact, same as the person they
    // blocked. Only sending new messages is disallowed (MessagesService
    // checks isBlockedEitherWay), not viewing what's already there.
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
  }

  async listBlocked(blockerId: string) {
    return this.prisma.block.findMany({ where: { blockerId }, select: { blockedId: true, createdAt: true } });
  }

  /** True if either user has blocked the other. */
  async isBlockedEitherWay(userIdA: string, userIdB: string) {
    const match = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userIdA, blockedId: userIdB },
          { blockerId: userIdB, blockedId: userIdA },
        ],
      },
      select: { id: true },
    });
    return match !== null;
  }
}
