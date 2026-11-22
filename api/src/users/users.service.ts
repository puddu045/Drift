import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertProfile } from './users.schemas.js';

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
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    return profile;
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
    const [profile, preferences] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.userPreferences.findUnique({ where: { userId } }),
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
    };
  }
}
