import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { BlocksService } from '../blocks/blocks.service.js';
import { MutesService } from '../mutes/mutes.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TranslationService } from '../translation/translation.service.js';
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
    thoughtReply: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    block: { findMany: vi.fn() },
    report: { create: vi.fn() },
    userPreferences: { findMany: vi.fn() },
    userProfile: { findMany: vi.fn() },
    thoughtTranslationQuota: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
  };
  const notifications = { create: vi.fn() };
  const mutes = { mutedAuthorIds: vi.fn() };
  const translation = {
    getPreferredLanguage: vi.fn().mockResolvedValue(null),
    translateBatch: vi.fn(),
  };
  const blocks = {
    isBlockedEitherWay: vi.fn().mockResolvedValue(false),
  };
  let service: ThoughtsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.userPreferences.findMany.mockResolvedValue([]);
    prisma.userProfile.findMany.mockResolvedValue([]);
    mutes.mutedAuthorIds.mockResolvedValue([]);
    translation.getPreferredLanguage.mockResolvedValue(null);
    blocks.isBlockedEitherWay.mockResolvedValue(false);
    prisma.thoughtTranslationQuota.findUnique.mockResolvedValue(null);
    prisma.thoughtTranslationQuota.count.mockResolvedValue(0);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ThoughtsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: MutesService, useValue: mutes },
        { provide: TranslationService, useValue: translation },
        { provide: BlocksService, useValue: blocks },
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

    // Security regression: a blocked relationship must stop a user from
    // reacting via a direct API call, not just hide the thought from feeds.
    it('404s when the caller and the author have blocked each other', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', authorId: 'author-1', deletedAt: null });
      blocks.isBlockedEitherWay.mockResolvedValue(true);
      await expect(service.toggleReaction('viewer', 't1', 'heart')).rejects.toThrow(NotFoundException);
      expect(prisma.thoughtReaction.create).not.toHaveBeenCalled();
    });
  });

  describe('reply', () => {
    it('404s when the caller and the thought\'s author have blocked each other', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', authorId: 'author-1', deletedAt: null });
      blocks.isBlockedEitherWay.mockResolvedValue(true);
      await expect(service.reply('viewer', 't1', { text: 'hi' })).rejects.toThrow(NotFoundException);
      expect(prisma.thoughtReply.create).not.toHaveBeenCalled();
    });

    it('allows replying when there is no block', async () => {
      prisma.thought.findUnique.mockResolvedValue({ id: 't1', authorId: 'author-1', deletedAt: null });
      prisma.thoughtReply.create.mockResolvedValue({ id: 'r1', authorId: 'viewer', text: 'hi' });
      prisma.userPreferences.findMany.mockResolvedValue([]);
      await expect(service.reply('viewer', 't1', { text: 'hi' })).resolves.toMatchObject({ id: 'r1' });
    });
  });

  describe('translateOne', () => {
    it('404s a private thought for a non-owner', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        text: 'hola',
        authorId: 'author-1',
        isPublic: false,
        deletedAt: null,
      });
      await expect(service.translateOne('someone-else', 't1')).rejects.toThrow(NotFoundException);
      expect(translation.getPreferredLanguage).not.toHaveBeenCalled();
    });

    it('requires a preferred language before translating', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        text: 'hola',
        authorId: 'author-1',
        isPublic: true,
        deletedAt: null,
      });
      translation.getPreferredLanguage.mockResolvedValue(null);
      await expect(service.translateOne('viewer', 't1')).rejects.toThrow(BadRequestException);
      expect(translation.translateBatch).not.toHaveBeenCalled();
    });

    it('translates into the viewer\'s preferred language, tagging the thought as the source', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        text: 'hola',
        authorId: 'author-1',
        isPublic: true,
        deletedAt: null,
      });
      translation.getPreferredLanguage.mockResolvedValue('en');
      translation.translateBatch.mockResolvedValue(['hello']);

      await expect(service.translateOne('viewer', 't1')).resolves.toEqual({
        translatedText: 'hello',
        language: 'en',
      });
      expect(translation.translateBatch).toHaveBeenCalledWith(['hola'], 'en', [{ type: 'thought', id: 't1' }]);
    });

    it('refuses once the daily translate quota for distinct thoughts is used up', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        text: 'hola',
        authorId: 'author-1',
        isPublic: true,
        deletedAt: null,
      });
      translation.getPreferredLanguage.mockResolvedValue('en');
      prisma.thoughtTranslationQuota.findUnique.mockResolvedValue(null); // not translated yet today
      prisma.thoughtTranslationQuota.count.mockResolvedValue(5); // already at the limit

      await expect(service.translateOne('viewer', 't1')).rejects.toThrow(ForbiddenException);
      expect(translation.translateBatch).not.toHaveBeenCalled();
    });

    it('does not spend a new quota slot re-translating a thought already translated today', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        text: 'hola',
        authorId: 'author-1',
        isPublic: true,
        deletedAt: null,
      });
      translation.getPreferredLanguage.mockResolvedValue('en');
      translation.translateBatch.mockResolvedValue(['hello']);
      // Already recorded as translated today — count would otherwise block.
      prisma.thoughtTranslationQuota.findUnique.mockResolvedValue({ userId: 'viewer', thoughtId: 't1', day: '2024-01-01' });
      prisma.thoughtTranslationQuota.count.mockResolvedValue(5);

      await expect(service.translateOne('viewer', 't1')).resolves.toEqual({
        translatedText: 'hello',
        language: 'en',
      });
      expect(prisma.thoughtTranslationQuota.create).not.toHaveBeenCalled();
    });
  });

  describe('translateReply', () => {
    it('404s when the reply does not belong to the given thought', async () => {
      prisma.thoughtReply.findUnique.mockResolvedValue({ id: 'r1', thoughtId: 'other-thought', text: 'hola' });
      await expect(service.translateReply('viewer', 't1', 'r1')).rejects.toThrow(NotFoundException);
    });

    it('404s a reply on a private thought for a non-owner', async () => {
      prisma.thoughtReply.findUnique.mockResolvedValue({ id: 'r1', thoughtId: 't1', text: 'hola', deletedAt: null });
      prisma.thought.findUnique.mockResolvedValue({ authorId: 'author-1', isPublic: false, deletedAt: null });
      await expect(service.translateReply('someone-else', 't1', 'r1')).rejects.toThrow(NotFoundException);
    });

    it('requires a preferred language before translating', async () => {
      prisma.thoughtReply.findUnique.mockResolvedValue({ id: 'r1', thoughtId: 't1', text: 'hola', deletedAt: null });
      prisma.thought.findUnique.mockResolvedValue({ authorId: 'author-1', isPublic: true, deletedAt: null });
      translation.getPreferredLanguage.mockResolvedValue(null);
      await expect(service.translateReply('viewer', 't1', 'r1')).rejects.toThrow(BadRequestException);
    });

    it("translates into the viewer's preferred language, tagging the reply as the source", async () => {
      prisma.thoughtReply.findUnique.mockResolvedValue({ id: 'r1', thoughtId: 't1', text: 'hola', deletedAt: null });
      prisma.thought.findUnique.mockResolvedValue({ authorId: 'author-1', isPublic: true, deletedAt: null });
      translation.getPreferredLanguage.mockResolvedValue('en');
      translation.translateBatch.mockResolvedValue(['hello']);

      await expect(service.translateReply('viewer', 't1', 'r1')).resolves.toEqual({
        translatedText: 'hello',
        language: 'en',
      });
      expect(translation.translateBatch).toHaveBeenCalledWith(['hola'], 'en', [{ type: 'reply', id: 'r1' }]);
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

    // Security regression: a client must not be able to deanonymize an
    // "anonymous" author (DECISIONS.md #1) by reading the raw authorId off
    // a thought/reply and looking it up via GET /profiles/:userId.
    it('strips the raw authorId for an anonymous (non-opted-in) author on someone else\'s thought', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        authorId: 'author-1',
        isPublic: true,
        deletedAt: null,
        replies: [{ id: 'r1', authorId: 'replier-1', text: 'hi' }],
      });
      prisma.userPreferences.findMany.mockResolvedValue([]); // nobody opted into showIdentityOnContent

      const result = await service.getOne('viewer', 't1');

      expect(result.authorId).toBeUndefined();
      expect(result.isOwnThought).toBe(false);
      expect(result.author).toBeNull();
      expect(result.replies[0].authorId).toBeUndefined();
      expect(result.replies[0].author).toBeNull();
    });

    it('keeps the raw authorId when the author opted into showIdentityOnContent', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        authorId: 'author-1',
        isPublic: true,
        deletedAt: null,
        replies: [],
      });
      prisma.userPreferences.findMany.mockResolvedValue([{ userId: 'author-1' }]);
      prisma.userProfile.findMany.mockResolvedValue([
        { userId: 'author-1', displayName: 'Alice', photoUrl: null },
      ]);

      const result = await service.getOne('viewer', 't1');
      expect(result.authorId).toBe('author-1');
      expect(result.author).toEqual({ displayName: 'Alice', photoUrl: null });
    });

    it('keeps the raw authorId for the viewer\'s own thought even though it stays anonymous to others', async () => {
      prisma.thought.findUnique.mockResolvedValue({
        id: 't1',
        authorId: 'viewer',
        isPublic: true,
        deletedAt: null,
        replies: [],
      });
      prisma.userPreferences.findMany.mockResolvedValue([]);

      const result = await service.getOne('viewer', 't1');
      expect(result.authorId).toBe('viewer');
      expect(result.isOwnThought).toBe(true);
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

    it('excludes muted authors', async () => {
      prisma.block.findMany.mockResolvedValue([]);
      mutes.mutedAuthorIds.mockResolvedValue(['muted-1']);
      prisma.thought.findMany.mockResolvedValue([]);

      await service.discover('viewer', { limit: 20 });

      expect(prisma.thought.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: { notIn: expect.arrayContaining(['muted-1']) },
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
          where: { id: { in: ['t1', 't2', 't3'] }, authorId: { notIn: ['user-1'] }, deletedAt: null },
        }),
      );
    });

    it('also excludes muted authors', async () => {
      prisma.thoughtReaction.findMany.mockResolvedValue([{ thoughtId: 't1' }]);
      prisma.thoughtReply.findMany.mockResolvedValue([]);
      mutes.mutedAuthorIds.mockResolvedValue(['muted-1']);
      prisma.thought.findMany.mockResolvedValue([]);

      await service.listInteractions('user-1');

      expect(prisma.thought.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['t1'] }, authorId: { notIn: ['user-1', 'muted-1'] }, deletedAt: null },
        }),
      );
    });
  });
});
