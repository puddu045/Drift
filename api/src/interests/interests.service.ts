import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class InterestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return this.prisma.interest.findMany({ orderBy: { name: 'asc' } });
  }
}
