import { Body, Controller, Get, NotFoundException, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

import type { AuthenticatedUser } from '../auth/current-user.js';
import type { UpsertProfile } from './users.schemas.js';
import { upsertProfileSchema, usernameParamSchema } from './users.schemas.js';
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

  @Get(':userId')
  async getPublicProfile(@Param('userId', { schema: usernameParamSchema }) userId: string) {
    return this.users.getPublicProfile(userId);
  }
}
