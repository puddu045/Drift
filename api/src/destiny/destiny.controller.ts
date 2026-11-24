import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { DestinyService } from './destiny.service.js';

@Controller('destiny')
export class DestinyController {
  constructor(private readonly destiny: DestinyService) {}

  @Get('today')
  getToday(@CurrentUser() user: AuthenticatedUser) {
    return this.destiny.getToday(user.id);
  }
}
