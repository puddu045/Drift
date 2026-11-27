import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { MutesService } from '../mutes/mutes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TranslationService } from '../translation/translation.service.js';
import { DestinyService } from './destiny.service.js';

describe('DestinyService', () => {
  const prisma = {
    destinyAssignment: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    block: { findMany: vi.fn() },
    thought: { findMany: vi.fn() },
  };
  const mutes = { mutedAuthorIds: vi.fn() };
  const translation = {
    getPreferredLanguage: vi.fn().mockResolvedValue(null),
    translateBatch: vi.fn(),
  };
  let service: DestinyService;

  beforeEach(async () => {
    vi.resetAllMocks();
    mutes.mutedAuthorIds.mockResolvedValue([]);
    prisma.destinyAssignment.findMany.mockResolvedValue([]);
    translation.getPreferredLanguage.mockResolvedValue(null);
    const moduleRef = await Test.createTestingModule({
      providers: [
        DestinyService,
        { provide: PrismaService, useValue: prisma },
        { provide: MutesService, useValue: mutes },
        { provide: TranslationService, useValue: translation },
      ],
    }).compile();
    service = moduleRef.get(DestinyService);
  });

  it("returns today's assignment again without picking a new one", async () => {
    prisma.destinyAssignment.findUnique.mockResolvedValue({ thought: { id: 't1' } });
    await expect(service.getToday('user-1')).resolves.toEqual({ id: 't1' });
    expect(prisma.thought.findMany).not.toHaveBeenCalled();
  });

  it('excludes the viewer\'s own thoughts, blocked authors, and muted authors from candidates', async () => {
    prisma.destinyAssignment.findUnique.mockResolvedValue(null);
    prisma.block.findMany.mockResolvedValue([{ blockerId: 'user-1', blockedId: 'blocked-1' }]);
    mutes.mutedAuthorIds.mockResolvedValue(['muted-1']);
    prisma.thought.findMany.mockResolvedValue([]);

    await expect(service.getToday('user-1')).rejects.toThrow(NotFoundException);

    expect(prisma.thought.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: { notIn: expect.arrayContaining(['user-1', 'blocked-1', 'muted-1']) },
        }),
      }),
    );
  });
});
