import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const prisma = {
    user: { upsert: vi.fn() },
    userProfile: { findUnique: vi.fn(), upsert: vi.fn() },
    userPreferences: { findUnique: vi.fn() },
    userInterest: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    interest: { count: vi.fn() },
    $transaction: vi.fn(),
  };
  let service: UsersService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('ensureUser', () => {
    it('upserts a bare user row by id, creating nothing extra on update', async () => {
      prisma.user.upsert.mockResolvedValue({ id: 'u1', status: 'active' });
      await service.ensureUser('u1');
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 'u1' },
        update: {},
        create: { id: 'u1' },
      });
    });
  });

  describe('upsertProfile', () => {
    const data = { displayName: 'Alice', username: 'alice' } as const;

    it('rejects a username already taken by someone else', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ userId: 'other-user' });
      await expect(service.upsertProfile('u1', data)).rejects.toThrow(ConflictException);
      expect(prisma.userProfile.upsert).not.toHaveBeenCalled();
    });

    it('allows the same user to keep their own username', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prisma.userProfile.upsert.mockResolvedValue({ userId: 'u1', ...data });
      await expect(service.upsertProfile('u1', data)).resolves.toMatchObject({ userId: 'u1' });
    });

    it('allows a free username', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      prisma.userProfile.upsert.mockResolvedValue({ userId: 'u1', ...data });
      await expect(service.upsertProfile('u1', data)).resolves.toMatchObject({ userId: 'u1' });
    });
  });

  describe('getPublicProfile', () => {
    it('hides country when the owner has showCountry off', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        displayName: 'Alice',
        username: 'alice',
        photoUrl: null,
        bio: null,
        relationshipIntent: 'just_sharing',
        country: 'US',
      });
      prisma.userPreferences.findUnique.mockResolvedValue({ showCountry: false });
      prisma.userInterest.findMany.mockResolvedValue([]);

      const result = await service.getPublicProfile('u1');
      expect(result.country).toBeNull();
    });

    it('shows country when the owner has showCountry on', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        displayName: 'Alice',
        username: 'alice',
        photoUrl: null,
        bio: null,
        relationshipIntent: 'just_sharing',
        country: 'US',
      });
      prisma.userPreferences.findUnique.mockResolvedValue({ showCountry: true });
      prisma.userInterest.findMany.mockResolvedValue([]);

      const result = await service.getPublicProfile('u1');
      expect(result.country).toBe('US');
    });

    it('includes the owner\'s interest names', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        displayName: 'Alice',
        username: 'alice',
        photoUrl: null,
        bio: null,
        relationshipIntent: 'just_sharing',
        country: 'US',
      });
      prisma.userPreferences.findUnique.mockResolvedValue({ showCountry: false });
      prisma.userInterest.findMany.mockResolvedValue([
        { interest: { name: 'Music' } },
        { interest: { name: 'Travel' } },
      ]);

      const result = await service.getPublicProfile('u1');
      expect(result.interests).toEqual(['Music', 'Travel']);
    });
  });

  describe('setMyInterests', () => {
    it('rejects an interest id that does not exist', async () => {
      prisma.interest.count.mockResolvedValue(1);
      await expect(
        service.setMyInterests('u1', { interestIds: ['a', 'b'] }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('replaces the user\'s interests in a transaction', async () => {
      prisma.interest.count.mockResolvedValue(2);
      prisma.$transaction.mockResolvedValue(undefined);

      await service.setMyInterests('u1', { interestIds: ['a', 'b'] });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.userInterest.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(prisma.userInterest.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'u1', interestId: 'a' },
          { userId: 'u1', interestId: 'b' },
        ],
      });
    });
  });
});
