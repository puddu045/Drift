import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { z } from 'zod';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { NotificationsService } from './notifications.service.js';

const idParamSchema = z.uuid();

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.list(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id', { schema: idParamSchema }) id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
