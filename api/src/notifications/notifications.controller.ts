import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { z } from 'zod';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { NotificationsService } from './notifications.service.js';

const markReadSchema = z.object({ ids: z.array(z.uuid()).min(1).max(50) });

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.list(user.id);
  }

  @Patch('read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Body({ schema: markReadSchema }) body: { ids: string[] }) {
    return this.notifications.markRead(user.id, body.ids);
  }
}
