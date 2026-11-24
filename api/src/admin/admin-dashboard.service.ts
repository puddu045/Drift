import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [totalUsers, suspendedOrBannedUsers, totalThoughts, openReports, totalReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: { in: ['suspended', 'banned'] } } }),
      this.prisma.thought.count({ where: { deletedAt: null } }),
      this.prisma.report.count({ where: { status: 'open' } }),
      this.prisma.report.count(),
    ]);

    return { totalUsers, suspendedOrBannedUsers, totalThoughts, openReports, totalReports };
  }
}
