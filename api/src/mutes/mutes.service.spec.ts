import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { MutesService } from './mutes.service.js';

describe('MutesService', () => {
  const prisma = {
    mute: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  };
  let service: MutesService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [MutesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(MutesService);
  });

  describe('mute', () => {
    it('rejects muting yourself', async () => {
      await expect(service.mute('u1', 'u1')).rejects.toThrow(BadRequestException);
      expect(prisma.mute.upsert).not.toHaveBeenCalled();
    });

    it('upserts a mute row', async () => {
      await service.mute('u1', 'u2');
      expect(prisma.mute.upsert).toHaveBeenCalledWith({
        where: { muterId_mutedId: { muterId: 'u1', mutedId: 'u2' } },
        update: {},
        create: { muterId: 'u1', mutedId: 'u2' },
      });
    });
  });

  describe('unmute', () => {
    it('deletes the mute row for that pair only', async () => {
      await service.unmute('u1', 'u2');
      expect(prisma.mute.deleteMany).toHaveBeenCalledWith({ where: { muterId: 'u1', mutedId: 'u2' } });
    });
  });

  describe('mutedAuthorIds', () => {
    it('returns just the muted ids', async () => {
      prisma.mute.findMany.mockResolvedValue([{ mutedId: 'a' }, { mutedId: 'b' }]);
      await expect(service.mutedAuthorIds('u1')).resolves.toEqual(['a', 'b']);
      expect(prisma.mute.findMany).toHaveBeenCalledWith({
        where: { muterId: 'u1' },
        select: { mutedId: true },
      });
    });
  });
});
