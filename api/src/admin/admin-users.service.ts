import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { ListUsersQuery, SetUserStatus } from './admin.schemas.js';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQuery) {
    const users = await this.prisma.user.findMany({
      where: query.search
        ? {
            profile: {
              OR: [
                { username: { contains: query.search, mode: 'insensitive' } },
                { displayName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        createdAt: true,
        profile: { select: { displayName: true, username: true } },
      },
    });

    const nextCursor = users.length === query.limit ? users[users.length - 1].id : null;
    return { users, nextCursor };
  }

  async get(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preferences: true,
        _count: { select: { thoughts: true, reportsMade: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const reportsAgainst = await this.prisma.report.count({ where: { reportedUserId: userId } });
    return { ...user, reportsAgainst };
  }

  async setStatus(adminId: string, userId: string, data: SetUserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status: data.status } });
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'user.status_changed',
        targetType: 'user',
        targetId: userId,
        metadata: { status: data.status },
      },
    });
    return updated;
  }
}
