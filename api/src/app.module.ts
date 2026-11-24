import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BlocksModule } from './blocks/blocks.module.js';
import { ConnectionsModule } from './connections/connections.module.js';
import { DestinyModule } from './destiny/destiny.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { InterestsModule } from './interests/interests.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { MutesModule } from './mutes/mutes.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RateLimitModule } from './rate-limit/rate-limit.module.js';
import { ThoughtsModule } from './thoughts/thoughts.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    // After AuthModule: its guard must populate request.user before
    // RateLimitModule's guard reads it (see that module's own comment).
    RateLimitModule,
    UsersModule,
    ThoughtsModule,
    BlocksModule,
    ConnectionsModule,
    MessagesModule,
    NotificationsModule,
    DestinyModule,
    DevicesModule,
    InterestsModule,
    MutesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_PIPE, useClass: StandardSchemaValidationPipe }],
})
export class AppModule {}
