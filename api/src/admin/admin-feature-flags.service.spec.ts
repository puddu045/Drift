import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { AdminFeatureFlagsService } from './admin-feature-flags.service.js';

describe('AdminFeatureFlagsService', () => {
  const prisma = {
    featureFlag: { findMany: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  let service: AdminFeatureFlagsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AdminFeatureFlagsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminFeatureFlagsService);
  });

  describe('set', () => {
    it('upserts the flag and writes an audit log entry', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({ key: 'new_ui', enabled: true, payload: null });

      await service.set('admin-1', 'new_ui', { enabled: true });

      expect(prisma.featureFlag.upsert).toHaveBeenCalledWith({
        where: { key: 'new_ui' },
        update: { enabled: true, payload: expect.anything() },
        create: { key: 'new_ui', enabled: true, payload: expect.anything() },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: 'admin-1', action: 'feature_flag.set', targetId: 'new_ui' }),
      });
    });
  });

  describe('delete', () => {
    it('deletes the flag and writes an audit log entry', async () => {
      await service.delete('admin-1', 'old_flag');

      expect(prisma.featureFlag.delete).toHaveBeenCalledWith({ where: { key: 'old_flag' } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: 'admin-1', action: 'feature_flag.deleted', targetId: 'old_flag' }),
      });
    });
  });
});
