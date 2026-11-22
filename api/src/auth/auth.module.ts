import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@nestjs/authentication';

import { UsersModule } from '../users/users.module.js';
import { SupabaseAuthProvider } from './supabase-auth.provider.js';

@Module({
  imports: [AuthenticationModule.forRoot({}), UsersModule],
  providers: [SupabaseAuthProvider],
})
export class AuthModule {}
