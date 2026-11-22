import { Module } from '@nestjs/common';

import { ReportsController } from './reports.controller.js';
import { ThoughtsController } from './thoughts.controller.js';
import { ThoughtsService } from './thoughts.service.js';

@Module({
  controllers: [ThoughtsController, ReportsController],
  providers: [ThoughtsService],
})
export class ThoughtsModule {}
