import { Injectable, NotFoundException } from '@nestjs/common';

import { MutesService } from '../mutes/mutes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TranslationService } from '../translation/translation.service.js';

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class DestinyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mutes: MutesService,
    private readonly translation: TranslationService,
  ) {}

  private async translateForViewer(viewerId: string, thought: { text: string }) {
    const preferredLanguage = await this.translation.getPreferredLanguage(viewerId);
    if (!preferredLanguage) return thought;
    const [translatedText] = await this.translation.translateBatch([thought.text], preferredLanguage);
    return { ...thought, text: translatedText };
  }

  async getToday(userId: string) {
    const today = startOfToday();

    const existing = await this.prisma.destinyAssignment.findUnique({
      where: { userId_assignedDate: { userId, assignedDate: today } },
      include: { thought: true },
    });
    if (existing) return this.translateForViewer(userId, existing.thought);

    const [blocks, mutedIds] = await Promise.all([
      this.prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
        select: { blockerId: true, blockedId: true },
      }),
      this.mutes.mutedAuthorIds(userId),
    ]);
    const excludedAuthorIds = new Set<string>([userId, ...mutedIds]);
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
    return this.translateForViewer(userId, assignment.thought);
  }
}
