import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SetFeatureFlag } from './admin.schemas.js';

@Injectable()
export class AdminFeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async set(adminId: string, key: string, data: SetFeatureFlag) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled: data.enabled, payload: data.payload ?? Prisma.JsonNull },
      create: { key, enabled: data.enabled, payload: data.payload ?? Prisma.JsonNull },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'feature_flag.set',
        targetType: 'feature_flag',
        targetId: key,
        metadata: { enabled: data.enabled },
      },
    });
    return flag;
  }

  async delete(adminId: string, key: string) {
    await this.prisma.featureFlag.delete({ where: { key } });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'feature_flag.deleted', targetType: 'feature_flag', targetId: key },
    });
  }
}
