import { Module } from '@nestjs/common';

import { MutesModule } from '../mutes/mutes.module.js';
import { DestinyController } from './destiny.controller.js';
import { DestinyService } from './destiny.service.js';

@Module({
  imports: [MutesModule],
  controllers: [DestinyController],
  providers: [DestinyService],
})
export class DestinyModule {}
