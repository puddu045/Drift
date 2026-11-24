import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ThoughtsService } from './thoughts.service.js';

describe('ThoughtsService', () => {
  const prisma = {
    thought: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    thoughtReaction: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    thoughtReply: { create: vi.fn(), findMany: vi.fn() },
    block: { findMany: vi.fn() },
    report: { create: vi.fn() },
    userPreferences: { findMany: vi.fn() },
    userProfile: { findMany: vi.fn() },
  };
  const notifications = { create: vi.fn() };
  let service: ThoughtsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.userPreferences.findMany.mockResolvedValue([]);
    prisma.userProfile.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ThoughtsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(ThoughtsService);
  });

  describe('deleteOwn', () => {
    it('rejects deleting another author\'s thought', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', authorId: 'author-1', deletedAt: null });
      await expect(service.deleteOwn('someone-else', 't1')).rejects.toThrow(ForbiddenException);
      expect(prisma.thought.update).not.toHaveBeenCalled();
    });

    it('404s for an already-deleted thought', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', authorId: 'author-1', deletedAt: new Date() });
      await expect(service.deleteOwn('author-1', 't1')).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes when the caller is the author', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', authorId: 'author-1', deletedAt: null });
      await service.deleteOwn('author-1', 't1');
      expect(prisma.thought.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('toggleReaction', () => {
    it('creates a reaction the first time', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', deletedAt: null });
      prisma.thoughtReaction.findUnique.mockResolvedValue(null);
      const result = await service.toggleReaction('user-1', 't1', 'heart');
      expect(result).toEqual({ reacted: true });
      expect(prisma.thoughtReaction.create).toHaveBeenCalledWith({
        data: { thoughtId: 't1', userId: 'user-1', type: 'heart' },
      });
    });

    it('removes the reaction on a second identical call (toggle)', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', deletedAt: null });
      prisma.thoughtReaction.findUnique.mockResolvedValue({ id: 'r1' });
      const result = await service.toggleReaction('user-1', 't1', 'heart');
      expect(result).toEqual({ reacted: false });
      expect(prisma.thoughtReaction.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('404s when the thought does not exist', async () => {
      prisma.thought.findUnique.mockResolvedValue(null);
      await expect(service.toggleReaction('user-1', 'missing', 'heart')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOne', () => {
    it('404s a private thought for a non-owner', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        authorId: 'author-1',
        isPublic: false,
        deletedAt: null,
      });
      await expect(service.getOne('someone-else', 't1')).rejects.toThrow(NotFoundException);
    });

    it('allows the owner to see their own private thought', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        authorId: 'author-1',
        isPublic: false,
        deletedAt: null,
        replies: [],
      });
      await expect(service.getOne('author-1', 't1')).resolves.toMatchObject({ id: 't1' });
    });
  });

  describe('discover', () => {
    it('excludes authors blocked in either direction', async () => {
      prisma.block.findMany.mockResolvedValue([
        { blockerId: 'viewer', blockedId: 'blocked-by-me' },
        { blockerId: 'blocked-me', blockedId: 'viewer' },
      ]);
      prisma.thought.findMany.mockResolvedValue([]);

      await service.discover('viewer', { limit: 20 });

      expect(prisma.thought.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: { notIn: expect.arrayContaining(['blocked-by-me', 'blocked-me']) },
          }),
        }),
      );
    });

    it('always excludes the viewer\'s own thoughts, even with no blocks', async () => {
      prisma.block.findMany.mockResolvedValue([]);
      prisma.thought.findMany.mockResolvedValue([]);

      await service.discover('viewer', { limit: 20 });

      expect(prisma.thought.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: { notIn: ['viewer'] },
          }),
        }),
      );
    });
  });

  describe('listMine', () => {
    it('lists only the caller\'s own, non-deleted thoughts, most recent first', async () => {
      prisma.thought.findMany.mockResolvedValue([]);

      await service.listMine('author-1');

      expect(prisma.thought.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: 'author-1', deletedAt: null },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('listInteractions', () => {
    it('returns nothing without querying thoughts when there are no reactions or replies', async () => {
      prisma.thoughtReaction.findMany.mockResolvedValue([]);
      prisma.thoughtReply.findMany.mockResolvedValue([]);

      const result = await service.listInteractions('user-1');

      expect(result).toEqual([]);
      expect(prisma.thought.findMany).not.toHaveBeenCalled();
    });

    it('fetches the deduped union of reacted-to and replied-to thoughts, excluding the caller\'s own', async () => {
      prisma.thoughtReaction.findMany.mockResolvedValue([{ thoughtId: 't1' }, { thoughtId: 't2' }]);
      prisma.thoughtReply.findMany.mockResolvedValue([{ thoughtId: 't2' }, { thoughtId: 't3' }]);
      prisma.thought.findMany.mockResolvedValue([]);

      await service.listInteractions('user-1');

      expect(prisma.thought.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['t1', 't2', 't3'] }, authorId: { not: 'user-1' }, deletedAt: null },
        }),
      );
    });
  });
});
