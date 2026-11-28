import { Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Put } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';

import type { AuthenticatedUser } from '../auth/current-user.js';
import type { SetInterests, UpdatePreferences, UpsertProfile } from './users.schemas.js';
import {
  setInterestsSchema,
  updatePreferencesSchema,
  upsertProfileSchema,
  usernameParamSchema,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

@Controller('profiles')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.users.getOwnProfile(user.id);
    if (!profile) throw new NotFoundException('Profile not set up yet');
    return profile;
  }

  @Patch('me')
  async upsertOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: upsertProfileSchema }) body: UpsertProfile,
  ) {
    return this.users.upsertProfile(user.id, body);
  }

  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: updatePreferencesSchema }) body: UpdatePreferences,
  ) {
    return this.users.updatePreferences(user.id, body);
  }

  @Get('me/interests')
  async getMyInterests(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getMyInterestIds(user.id);
  }

  @Put('me/interests')
  async setMyInterests(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: setInterestsSchema }) body: SetInterests,
  ) {
    return this.users.setMyInterests(user.id, body);
  }

  @Get('me/translation-usage')
  async getMyTranslationUsage(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getTranslationUsage(user.id);
  }

  @Get(':userId')
  async getPublicProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', { schema: usernameParamSchema }) userId: string,
  ) {
    return this.users.getPublicProfile(user.id, userId);
  }

  @Get(':userId/thoughts')
  async getPublicThoughts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', { schema: usernameParamSchema }) userId: string,
  ) {
    return this.users.listPublicThoughtsByAuthor(user.id, userId);
  }

  // Tighter than the app-wide default — each call hits the paid Google
  // Translate API and consumes the shared monthly character quota.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':userId/translate-bio')
  @HttpCode(200)
  async translateBio(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', { schema: usernameParamSchema }) userId: string,
  ) {
    return this.users.translateBio(user.id, userId);
  }
}
