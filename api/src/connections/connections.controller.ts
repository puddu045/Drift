import { Controller, Delete, Get, HttpCode, Param, Post, Body } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { ConnectionsService } from './connections.service.js';
import type { CreateRequest } from './connections.schemas.js';
import { createRequestSchema, idParamSchema } from './connections.schemas.js';

@Controller()
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post('connection-requests')
  sendRequest(@CurrentUser() user: AuthenticatedUser, @Body({ schema: createRequestSchema }) body: CreateRequest) {
    return this.connections.sendRequest(user.id, body);
  }

  @Get('connection-requests/incoming')
  incoming(@CurrentUser() user: AuthenticatedUser) {
    return this.connections.listIncoming(user.id);
  }

  @Get('connection-requests/outgoing')
  outgoing(@CurrentUser() user: AuthenticatedUser) {
    return this.connections.listOutgoing(user.id);
  }

  @Post('connection-requests/:id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    return this.connections.acceptRequest(user.id, id);
  }

  @Post('connection-requests/:id/decline')
  @HttpCode(200)
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    return this.connections.declineRequest(user.id, id);
  }

  @Post('connection-requests/:id/withdraw')
  @HttpCode(200)
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    return this.connections.withdrawRequest(user.id, id);
  }

  @Get('connections')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.connections.listConnections(user.id);
  }

  @Delete('connections/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    return this.connections.removeConnection(user.id, id);
  }
}
