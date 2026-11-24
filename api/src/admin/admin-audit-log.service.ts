import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { ListAuditLogQuery } from './admin.schemas.js';

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAuditLogQuery) {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const nextCursor = entries.length === query.limit ? entries[entries.length - 1].id : null;
    return { entries, nextCursor };
  }
}
