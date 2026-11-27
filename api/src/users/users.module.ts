import { Module } from '@nestjs/common';

import { BlocksModule } from '../blocks/blocks.module.js';
import { TranslationModule } from '../translation/translation.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TranslationModule, BlocksModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
