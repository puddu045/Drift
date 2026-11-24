import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

describe('AdminDashboardService', () => {
  const prisma = {
    user: { count: vi.fn() },
    thought: { count: vi.fn() },
    report: { count: vi.fn() },
  };
  let service: AdminDashboardService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AdminDashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminDashboardService);
  });

  it('gathers counts from each model', async () => {
    prisma.user.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    prisma.thought.count.mockResolvedValue(40);
    prisma.report.count.mockResolvedValueOnce(3).mockResolvedValueOnce(8);

    await expect(service.stats()).resolves.toEqual({
      totalUsers: 10,
      suspendedOrBannedUsers: 2,
      totalThoughts: 40,
      openReports: 3,
      totalReports: 8,
    });
  });
});
