import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MutesService {
  constructor(private readonly prisma: PrismaService) {}

  async mute(muterId: string, mutedId: string) {
    if (muterId === mutedId) throw new BadRequestException('Cannot mute yourself');
    await this.prisma.mute.upsert({
      where: { muterId_mutedId: { muterId, mutedId } },
      update: {},
      create: { muterId, mutedId },
    });
  }

  async unmute(muterId: string, mutedId: string) {
    await this.prisma.mute.deleteMany({ where: { muterId, mutedId } });
  }

  async listMuted(muterId: string) {
    return this.prisma.mute.findMany({ where: { muterId }, select: { mutedId: true, createdAt: true } });
  }

  async mutedAuthorIds(muterId: string) {
    const rows = await this.prisma.mute.findMany({ where: { muterId }, select: { mutedId: true } });
    return rows.map((r) => r.mutedId);
  }
}
