import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { AdminUsersService } from './admin-users.service.js';

describe('AdminUsersService', () => {
  const prisma = {
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    report: { count: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  let service: AdminUsersService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AdminUsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminUsersService);
  });

  describe('setStatus', () => {
    it('404s for a missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.setStatus('admin-1', 'missing', { status: 'banned' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the status and writes an audit log entry', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({ id: 'u1', status: 'suspended' });

      await service.setStatus('admin-1', 'u1', { status: 'suspended' });

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { status: 'suspended' } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: 'admin-1', action: 'user.status_changed', targetId: 'u1' }),
      });
    });
  });

  describe('list', () => {
    it('searches by username or display name, case-insensitively', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.list({ search: 'alice', limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profile: {
              OR: [
                { username: { contains: 'alice', mode: 'insensitive' } },
                { displayName: { contains: 'alice', mode: 'insensitive' } },
              ],
            },
          },
        }),
      );
    });
  });
});
