import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { AdminReportsService } from './admin-reports.service.js';

describe('AdminReportsService', () => {
  const prisma = {
    report: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    moderationAction: { create: vi.fn() },
    thought: { update: vi.fn() },
    thoughtReply: { update: vi.fn() },
    message: { update: vi.fn() },
    user: { update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  let service: AdminReportsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    const moduleRef = await Test.createTestingModule({
      providers: [AdminReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminReportsService);
  });

  describe('resolve', () => {
    it('404s for a missing report', async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      await expect(service.resolve('admin-1', 'missing', { action: 'dismissed' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('dismissing a report does not touch the content or the target user', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: 'thought',
        reportedUserId: null,
        thought: { id: 't1', authorId: 'author-1', deletedAt: null },
        reply: null,
        message: null,
      });

      await service.resolve('admin-1', 'r1', { action: 'dismissed' });

      expect(prisma.report.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'dismissed' } });
      expect(prisma.thought.update).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('content_removed soft-deletes the reported thought and resolves the report', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: 'thought',
        reportedUserId: null,
        thought: { id: 't1', authorId: 'author-1', deletedAt: null },
        reply: null,
        message: null,
      });

      await service.resolve('admin-1', 'r1', { action: 'content_removed' });

      expect(prisma.report.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'resolved' } });
      expect(prisma.thought.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('does not re-soft-delete content that is already deleted', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: 'thought',
        reportedUserId: null,
        thought: { id: 't1', authorId: 'author-1', deletedAt: new Date() },
        reply: null,
        message: null,
      });

      await service.resolve('admin-1', 'r1', { action: 'content_removed' });

      expect(prisma.thought.update).not.toHaveBeenCalled();
    });

    it('suspending via a report updates the reported user\'s status', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: 'profile',
        reportedUserId: 'author-1',
        thought: null,
        reply: null,
        message: null,
      });

      await service.resolve('admin-1', 'r1', { action: 'suspended' });

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'author-1' }, data: { status: 'suspended' } });
    });

    it('always writes an audit log entry', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: 'thought',
        reportedUserId: null,
        thought: { id: 't1', authorId: 'author-1', deletedAt: null },
        reply: null,
        message: null,
      });

      await service.resolve('admin-1', 'r1', { action: 'warning', notes: 'be nice' });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'report.warning',
          targetId: 'author-1',
        }),
      });
    });
  });
});
