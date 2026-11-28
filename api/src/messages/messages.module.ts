import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { TranslationModule } from '../translation/translation.module.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

@Module({
  imports: [NotificationsModule, TranslationModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
