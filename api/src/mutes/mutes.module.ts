import { Module } from '@nestjs/common';

import { MutesController } from './mutes.controller.js';
import { MutesService } from './mutes.service.js';

@Module({
  controllers: [MutesController],
  providers: [MutesService],
  exports: [MutesService],
})
export class MutesModule {}
