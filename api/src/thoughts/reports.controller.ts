import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';

import type { AuthenticatedUser } from '../auth/current-user.js';
import type { CreateReport } from './thoughts.schemas.js';
import { createReportSchema } from './thoughts.schemas.js';
import { ThoughtsService } from './thoughts.service.js';

// Reports can target a thought, reply, or profile — kept with ThoughtsService
// for now since that's where the report logic lives in this phase. Message
// reporting is added in Phase 3 once messaging exists.
@Controller('reports')
export class ReportsController {
  constructor(private readonly thoughts: ThoughtsService) {}

  // Tighter than the app-wide default: unlike most actions, a burst of
  // reports is itself a plausible abuse pattern (flooding the moderation
  // queue, or mass-reporting one person/thought to force action on it).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body({ schema: createReportSchema }) body: CreateReport) {
    return this.thoughts.report(user.id, body);
  }
}
