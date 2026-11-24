import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

import type { AuthenticatedUser } from '../auth/current-user.js';
import type { MuteUser } from './mutes.schemas.js';
import { muteUserSchema } from './mutes.schemas.js';
import { MutesService } from './mutes.service.js';

@Controller('mutes')
export class MutesController {
  constructor(private readonly mutes: MutesService) {}

  @Post()
  @HttpCode(200)
  mute(@CurrentUser() user: AuthenticatedUser, @Body({ schema: muteUserSchema }) body: MuteUser) {
    return this.mutes.mute(user.id, body.userId);
  }

  @Delete(':userId')
  @HttpCode(204)
  unmute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', { schema: muteUserSchema.shape.userId }) userId: string,
  ) {
    return this.mutes.unmute(user.id, userId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.mutes.listMuted(user.id);
  }
}
