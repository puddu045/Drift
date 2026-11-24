import { Module } from '@nestjs/common';

import { DestinyController } from './destiny.controller.js';
import { DestinyService } from './destiny.service.js';

@Module({
  controllers: [DestinyController],
  providers: [DestinyService],
})
export class DestinyModule {}
