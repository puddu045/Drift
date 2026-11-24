import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

import type { AuthenticatedUser } from '../auth/current-user.js';
import type { BlockUser } from './blocks.schemas.js';
import { blockUserSchema } from './blocks.schemas.js';
import { BlocksService } from './blocks.service.js';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Post()
  @HttpCode(200)
  block(@CurrentUser() user: AuthenticatedUser, @Body({ schema: blockUserSchema }) body: BlockUser) {
    return this.blocks.block(user.id, body.userId);
  }

  @Delete(':userId')
  @HttpCode(204)
  unblock(@CurrentUser() user: AuthenticatedUser, @Param('userId', { schema: blockUserSchema.shape.userId }) userId: string) {
    return this.blocks.unblock(user.id, userId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.blocks.listBlocked(user.id);
  }
}
