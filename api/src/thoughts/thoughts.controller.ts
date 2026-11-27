import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

import type { AuthenticatedUser } from '../auth/current-user.js';
import type { CreateReply, CreateThought, DiscoverQuery, React } from './thoughts.schemas.js';
import {
  createReplySchema,
  createThoughtSchema,
  discoverQuerySchema,
  idParamSchema,
  reactSchema,
} from './thoughts.schemas.js';
import { ThoughtsService } from './thoughts.service.js';

@Controller('thoughts')
export class ThoughtsController {
  constructor(private readonly thoughts: ThoughtsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body({ schema: createThoughtSchema }) body: CreateThought) {
    return this.thoughts.create(user.id, body);
  }

  @Get()
  discover(@CurrentUser() user: AuthenticatedUser, @Query({ schema: discoverQuerySchema }) query: DiscoverQuery) {
    return this.thoughts.discover(user.id, query);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.thoughts.listMine(user.id);
  }

  @Get('interactions')
  listInteractions(@CurrentUser() user: AuthenticatedUser) {
    return this.thoughts.listInteractions(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    return this.thoughts.getOne(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteOwn(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    await this.thoughts.deleteOwn(user.id, id);
  }

  @Post(':id/reactions')
  @HttpCode(200)
  react(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: reactSchema }) body: React,
  ) {
    return this.thoughts.toggleReaction(user.id, id, body.type);
  }

  @Post(':id/replies')
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: createReplySchema }) body: CreateReply,
  ) {
    return this.thoughts.reply(user.id, id, body);
  }

  @Post(':id/translate')
  @HttpCode(200)
  translateOne(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    return this.thoughts.translateOne(user.id, id);
  }

  @Post(':id/replies/:replyId/translate')
  @HttpCode(200)
  translateReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idParamSchema }) id: string,
    @Param('replyId', { schema: idParamSchema }) replyId: string,
  ) {
    return this.thoughts.translateReply(user.id, id, replyId);
  }
}
