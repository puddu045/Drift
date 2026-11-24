import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListReportsQuery, ResolveReport } from './admin.schemas.js';

/** Actions that both close out a report and warrant a status change on its target. */
const STATUS_BY_ACTION: Partial<Record<ResolveReport['action'], 'suspended' | 'banned'>> = {
  suspended: 'suspended',
  banned: 'banned',
};

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListReportsQuery) {
    const reports = await this.prisma.report.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        thought: { select: { id: true, text: true, authorId: true, deletedAt: true } },
        reply: { select: { id: true, text: true, authorId: true, deletedAt: true } },
        message: { select: { id: true, text: true, senderId: true, deletedAt: true } },
      },
    });

    const nextCursor = reports.length === query.limit ? reports[reports.length - 1].id : null;
    return { reports, nextCursor };
  }

  /** The user the report is actually about, regardless of which content type it targets. */
  private targetUserId(report: {
    targetType: string;
    reportedUserId: string | null;
    thought: { authorId: string } | null;
    reply: { authorId: string } | null;
    message: { senderId: string } | null;
  }) {
    return report.reportedUserId ?? report.thought?.authorId ?? report.reply?.authorId ?? report.message?.senderId ?? null;
  }

  async resolve(adminId: string, reportId: string, data: ResolveReport) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { thought: true, reply: true, message: true },
    });
    if (!report) throw new NotFoundException('Report not found');

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.report.update({
        where: { id: reportId },
        data: { status: data.action === 'dismissed' ? 'dismissed' : 'resolved' },
      }),
      this.prisma.moderationAction.create({
        data: { reportId, adminId, action: data.action, notes: data.notes },
      }),
    ];

    if (data.action === 'content_removed') {
      if (report.thought && !report.thought.deletedAt) {
        operations.push(this.prisma.thought.update({ where: { id: report.thought.id }, data: { deletedAt: new Date() } }));
      }
      if (report.reply && !report.reply.deletedAt) {
        operations.push(this.prisma.thoughtReply.update({ where: { id: report.reply.id }, data: { deletedAt: new Date() } }));
      }
      if (report.message && !report.message.deletedAt) {
        operations.push(this.prisma.message.update({ where: { id: report.message.id }, data: { deletedAt: new Date() } }));
      }
    }

    const newStatus = STATUS_BY_ACTION[data.action];
    const targetUserId = this.targetUserId(report);
    if (newStatus && targetUserId) {
      operations.push(this.prisma.user.update({ where: { id: targetUserId }, data: { status: newStatus } }));
    }

    operations.push(
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: `report.${data.action}`,
          targetType: report.targetType,
          targetId: targetUserId ?? reportId,
          metadata: { reportId, notes: data.notes ?? null },
        },
      }),
    );

    await this.prisma.$transaction(operations);
  }
}
