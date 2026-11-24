import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BlocksModule } from './blocks/blocks.module.js';
import { ConnectionsModule } from './connections/connections.module.js';
import { DestinyModule } from './destiny/destiny.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { InterestsModule } from './interests/interests.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ThoughtsModule } from './thoughts/thoughts.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ThoughtsModule,
    BlocksModule,
    ConnectionsModule,
    MessagesModule,
    NotificationsModule,
    DestinyModule,
    DevicesModule,
    InterestsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ThrottlerGuard,
    { provide: APP_GUARD, useExisting: ThrottlerGuard },
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
  ],
})
export class AppModule {}
