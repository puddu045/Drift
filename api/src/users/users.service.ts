import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TranslationService } from '../translation/translation.service.js';
import { SetInterests, UpdatePreferences, UpsertProfile } from './users.schemas.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
  ) {}

  /**
   * Finds or creates the bare User row for a Supabase-verified id. Called on
   * every authenticated request (see SupabaseAuthProvider) — see
   * prisma/schema.prisma's top comment for why there's no separate sync step.
   *
   * The app fires several requests for the same user in parallel (e.g. on
   * first launch, loading Universe/notifications/connections at once), so
   * two of these can race on the very first call for a brand-new id. Upsert
   * isn't atomic here, so both can see "not found" and both try to create —
   * the loser hits a unique constraint violation instead of just updating.
   * Treat that as a sign the row now exists and fetch it.
   */
  async ensureUser(id: string) {
    try {
      return await this.prisma.user.upsert({
        where: { id },
        update: {},
        create: { id },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.prisma.user.findUniqueOrThrow({ where: { id } });
      }
      throw err;
    }
  }

  async getOwnProfile(userId: string) {
    const [profile, preferences] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.userPreferences.findUnique({ where: { userId } }),
    ]);
    if (!profile) return null;
    return {
      ...profile,
      showIdentityOnContent: preferences?.showIdentityOnContent ?? false,
      preferredLanguage: preferences?.preferredLanguage ?? null,
    };
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

  /** On-demand translation for a profile's bio — the "Translate" button on it. */
  async translateBio(viewerId: string, userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId }, select: { bio: true } });
    if (!profile) throw new NotFoundException('Profile not found');
    if (!profile.bio) throw new BadRequestException('This profile has no bio to translate.');

    const preferredLanguage = await this.translation.getPreferredLanguage(viewerId);
    if (!preferredLanguage) {
      throw new BadRequestException('Set a preferred language in your profile before translating.');
    }

    const [translatedText] = await this.translation.translateBatch([profile.bio], preferredLanguage, [
      { type: 'profile_bio', id: userId },
    ]);
    return { translatedText, language: preferredLanguage };
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
