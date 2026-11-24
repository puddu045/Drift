import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { MutesService } from '../mutes/mutes.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateReply,
  CreateReport,
  CreateThought,
  DiscoverQuery,
  reactionTypeSchema,
} from './thoughts.schemas.js';

type ReactionType = import('zod').infer<typeof reactionTypeSchema>;

@Injectable()
export class ThoughtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mutes: MutesService,
  ) {}

  async create(authorId: string, data: CreateThought) {
    return this.prisma.thought.create({
      data: { authorId, text: data.text, mood: data.mood, isPublic: data.isPublic },
    });
  }

  /**
   * Global public feed for the Universe screen — other people's thoughts only.
   * A user's own thoughts never appear here; see listMine for those.
   */
  async discover(viewerId: string, query: DiscoverQuery) {
    const [blocks, mutedIds] = await Promise.all([
      this.prisma.block.findMany({
        where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
        select: { blockerId: true, blockedId: true },
      }),
      this.mutes.mutedAuthorIds(viewerId),
    ]);
    const excludedAuthorIds = new Set<string>([viewerId, ...mutedIds]);
    for (const block of blocks) {
      excludedAuthorIds.add(block.blockerId === viewerId ? block.blockedId : block.blockerId);
    }

    const thoughts = await this.prisma.thought.findMany({
      where: {
        isPublic: true,
        deletedAt: null,
        authorId: { notIn: [...excludedAuthorIds] },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, text: true, mood: true, createdAt: true },
    });

    const nextCursor = thoughts.length === query.limit ? thoughts[thoughts.length - 1].id : null;
    return { thoughts, nextCursor };
  }

  /** Everything a user has posted themselves, for their own "My Thoughts" view. */
  async listMine(userId: string) {
    return this.prisma.thought.findMany({
      where: { authorId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, text: true, mood: true, createdAt: true },
    });
  }

  /** Other people's thoughts the user has reacted to or replied on, for "My Interactions". */
  async listInteractions(userId: string) {
    const [reactions, replies, mutedIds] = await Promise.all([
      this.prisma.thoughtReaction.findMany({ where: { userId }, select: { thoughtId: true } }),
      this.prisma.thoughtReply.findMany({
        where: { authorId: userId, deletedAt: null },
        select: { thoughtId: true },
      }),
      this.mutes.mutedAuthorIds(userId),
    ]);
    const thoughtIds = [...new Set([...reactions, ...replies].map((r) => r.thoughtId))];
    if (thoughtIds.length === 0) return [];

    return this.prisma.thought.findMany({
      where: {
        id: { in: thoughtIds },
        authorId: { notIn: [userId, ...mutedIds] },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, text: true, mood: true, createdAt: true },
    });
  }

  async getOne(viewerId: string, thoughtId: string) {
    const thought = await this.prisma.thought.findUnique({
      where: { id: thoughtId },
      include: {
        replies: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        _count: { select: { reactions: true } },
      },
    });
    if (!thought || thought.deletedAt) throw new NotFoundException('Thought not found');
    if (!thought.isPublic && thought.authorId !== viewerId) {
      throw new NotFoundException('Thought not found');
    }

    const identities = await this.identityMap([thought.authorId, ...thought.replies.map((r) => r.authorId)]);
    return {
      ...thought,
      author: identities.get(thought.authorId) ?? null,
      replies: thought.replies.map((reply) => ({ ...reply, author: identities.get(reply.authorId) ?? null })),
    };
  }

  /**
   * Display name/photo for authors who opted in (DECISIONS.md #1 — anonymous by
   * default, user-controlled reveal). Omitted authors stay anonymous to callers.
   */
  private async identityMap(authorIds: string[]) {
    const uniqueIds = [...new Set(authorIds)];
    const revealed = await this.prisma.userPreferences.findMany({
      where: { userId: { in: uniqueIds }, showIdentityOnContent: true },
      select: { userId: true },
    });
    if (revealed.length === 0) return new Map<string, { displayName: string; photoUrl: string | null }>();

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: revealed.map((r) => r.userId) } },
      select: { userId: true, displayName: true, photoUrl: true },
    });
    return new Map(profiles.map((p) => [p.userId, { displayName: p.displayName, photoUrl: p.photoUrl }]));
  }

  async deleteOwn(userId: string, thoughtId: string) {
    const thought = await this.prisma.thought.findUnique({ where: { id: thoughtId } });
    if (!thought || thought.deletedAt) throw new NotFoundException('Thought not found');
    if (thought.authorId !== userId) throw new ForbiddenException('Not your thought');

    await this.prisma.thought.update({
      where: { id: thoughtId },
      data: { deletedAt: new Date() },
    });
  }

  /** Reacting again with the same type un-reacts (toggle), matching a "tap to react" UI. */
  async toggleReaction(userId: string, thoughtId: string, type: ReactionType) {
    const thought = await this.prisma.thought.findUnique({ where: { id: thoughtId } });
    if (!thought || thought.deletedAt) throw new NotFoundException('Thought not found');

    const existing = await this.prisma.thoughtReaction.findUnique({
      where: { thoughtId_userId_type: { thoughtId, userId, type } },
    });

    if (existing) {
      await this.prisma.thoughtReaction.delete({ where: { id: existing.id } });
      return { reacted: false };
    }
    await this.prisma.thoughtReaction.create({ data: { thoughtId, userId, type } });
    if (thought.authorId !== userId) {
      await this.notifications.create(thought.authorId, 'reaction', { thoughtId, type });
    }
    return { reacted: true };
  }

  async reply(userId: string, thoughtId: string, data: CreateReply) {
    const thought = await this.prisma.thought.findUnique({ where: { id: thoughtId } });
    if (!thought || thought.deletedAt) throw new NotFoundException('Thought not found');

    const reply = await this.prisma.thoughtReply.create({
      data: { thoughtId, authorId: userId, text: data.text },
    });
    if (thought.authorId !== userId) {
      await this.notifications.create(thought.authorId, 'reply', { thoughtId, replyId: reply.id });
    }
    const identities = await this.identityMap([userId]);
    return { ...reply, author: identities.get(userId) ?? null };
  }

  async report(reporterId: string, data: CreateReport) {
    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: data.targetType,
        reason: data.reason,
        ...(data.targetType === 'thought' ? { thoughtId: data.targetId } : {}),
        ...(data.targetType === 'reply' ? { replyId: data.targetId } : {}),
        ...(data.targetType === 'profile' ? { reportedUserId: data.targetId } : {}),
        ...(data.targetType === 'message' ? { messageId: data.targetId } : {}),
      },
    });
  }
}
