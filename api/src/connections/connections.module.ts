import { Module } from '@nestjs/common';

import { BlocksModule } from '../blocks/blocks.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ConnectionsController } from './connections.controller.js';
import { ConnectionsService } from './connections.service.js';

@Module({
  imports: [BlocksModule, NotificationsModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
