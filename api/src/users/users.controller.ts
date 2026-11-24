import { Body, Controller, Get, NotFoundException, Param, Patch, Put } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

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

  @Get(':userId')
  async getPublicProfile(@Param('userId', { schema: usernameParamSchema }) userId: string) {
    return this.users.getPublicProfile(userId);
  }

  @Get(':userId/thoughts')
  async getPublicThoughts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', { schema: usernameParamSchema }) userId: string,
  ) {
    return this.users.listPublicThoughtsByAuthor(user.id, userId);
  }
}
