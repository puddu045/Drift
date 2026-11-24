import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { ReportsController } from './reports.controller.js';
import { ThoughtsController } from './thoughts.controller.js';
import { ThoughtsService } from './thoughts.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ThoughtsController, ReportsController],
  providers: [ThoughtsService],
})
export class ThoughtsModule {}
