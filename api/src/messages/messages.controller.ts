import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { MessagesService } from './messages.service.js';
import type { MessagesQuery, SendMessage } from './messages.schemas.js';
import { idParamSchema, messagesQuerySchema, sendMessageSchema } from './messages.schemas.js';

@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.listConversations(user.id);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idParamSchema }) id: string,
    @Query({ schema: messagesQuerySchema }) query: MessagesQuery,
  ) {
    return this.messages.listMessages(user.id, id, query);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idParamSchema }) id: string,
    @Body({ schema: sendMessageSchema }) body: SendMessage,
  ) {
    return this.messages.sendMessage(user.id, id, body.text);
  }

  // Tighter than the app-wide default — each call hits the paid Google
  // Translate API and consumes the shared monthly character quota.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('conversations/:id/messages/:messageId/translate')
  @HttpCode(200)
  translateMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idParamSchema }) id: string,
    @Param('messageId', { schema: idParamSchema }) messageId: string,
  ) {
    return this.messages.translateMessage(user.id, id, messageId);
  }
}
