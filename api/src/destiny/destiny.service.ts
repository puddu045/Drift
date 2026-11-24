import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class DestinyService {
  constructor(private readonly prisma: PrismaService) {}

  async getToday(userId: string) {
    const today = startOfToday();

    const existing = await this.prisma.destinyAssignment.findUnique({
      where: { userId_assignedDate: { userId, assignedDate: today } },
      include: { thought: true },
    });
    if (existing) return existing.thought;

    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const excludedAuthorIds = new Set<string>([userId]);
    for (const block of blocks) {
      excludedAuthorIds.add(block.blockerId === userId ? block.blockedId : block.blockerId);
    }

    const previouslyAssigned = await this.prisma.destinyAssignment.findMany({
      where: { userId },
      select: { thoughtId: true },
    });

    const candidates = await this.prisma.thought.findMany({
      where: {
        isPublic: true,
        deletedAt: null,
        authorId: { notIn: [...excludedAuthorIds] },
        id: { notIn: previouslyAssigned.map((a) => a.thoughtId) },
      },
      select: { id: true },
      take: 200,
    });
    if (candidates.length === 0) throw new NotFoundException('No thought available for Destiny today');

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const assignment = await this.prisma.destinyAssignment.create({
      data: { userId, thoughtId: chosen.id, assignedDate: today },
      include: { thought: true },
    });
    return assignment.thought;
  }
}
