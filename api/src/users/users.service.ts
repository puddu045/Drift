import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { SetInterests, UpdatePreferences, UpsertProfile } from './users.schemas.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds or creates the bare User row for a Supabase-verified id. Called on
   * every authenticated request (see SupabaseAuthProvider) — see
   * prisma/schema.prisma's top comment for why there's no separate sync step.
   */
  async ensureUser(id: string) {
    return this.prisma.user.upsert({
      where: { id },
      update: {},
      create: { id },
    });
  }

  async getOwnProfile(userId: string) {
    const [profile, preferences] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.userPreferences.findUnique({ where: { userId } }),
    ]);
    if (!profile) return null;
    return { ...profile, showIdentityOnContent: preferences?.showIdentityOnContent ?? false };
  }

  async upsertProfile(userId: string, data: UpsertProfile) {
    const existingUsername = await this.prisma.userProfile.findUnique({
      where: { username: data.username },
      select: { userId: true },
    });
    if (existingUsername && existingUsername.userId !== userId) {
      throw new ConflictException('Username is already taken');
    }

    return this.prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  /** Public-safe view of another user's profile, honoring their privacy settings. */
  async getPublicProfile(userId: string) {
    const [profile, preferences, interests] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.userPreferences.findUnique({ where: { userId } }),
      this.prisma.userInterest.findMany({ where: { userId }, select: { interest: { select: { name: true } } } }),
    ]);
    if (!profile) throw new NotFoundException('Profile not found');

    return {
      userId: profile.userId,
      displayName: profile.displayName,
      username: profile.username,
      photoUrl: profile.photoUrl,
      bio: profile.bio,
      relationshipIntent: profile.relationshipIntent,
      country: preferences?.showCountry ? profile.country : null,
      interests: interests.map((i) => i.interest.name),
    };
  }

  async updatePreferences(userId: string, data: UpdatePreferences) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: { userId, languages: [], ...data },
    });
  }

  async getMyInterestIds(userId: string) {
    const rows = await this.prisma.userInterest.findMany({ where: { userId }, select: { interestId: true } });
    return rows.map((r) => r.interestId);
  }

  async setMyInterests(userId: string, data: SetInterests) {
    const uniqueIds = [...new Set(data.interestIds)];
    if (uniqueIds.length > 0) {
      const count = await this.prisma.interest.count({ where: { id: { in: uniqueIds } } });
      if (count !== uniqueIds.length) throw new BadRequestException('One or more interests do not exist');
    }

    await this.prisma.$transaction([
      this.prisma.userInterest.deleteMany({ where: { userId } }),
      this.prisma.userInterest.createMany({
        data: uniqueIds.map((interestId) => ({ userId, interestId })),
      }),
    ]);
  }

  /** Another user's public thoughts, for the "view their profile" screen. */
  async listPublicThoughtsByAuthor(viewerId: string, authorId: string) {
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: authorId },
          { blockerId: authorId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    });
    if (blocked) throw new ForbiddenException('Not available');

    return this.prisma.thought.findMany({
      where: { authorId, isPublic: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, text: true, mood: true, createdAt: true },
    });
  }
}
