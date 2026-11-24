import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtBearerProviderOptions,
  type JwtClaims,
} from '@nestjs/authentication';

import { UsersService } from '../users/users.service.js';
import { AuthenticatedUser } from './current-user.js';

function buildOptions(config: ConfigService): JwtBearerProviderOptions {
  const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
  const jwks = config.get<string>('SUPABASE_JWKS_URL');
  const sharedSecret = config.get<string>('SUPABASE_JWT_SECRET');

  return {
    issuer: `${supabaseUrl}/auth/v1`,
    audience: 'authenticated',
    // Prefer the modern JWKS (asymmetric signing keys); fall back to the
    // legacy shared secret for projects that haven't migrated yet.
    ...(jwks ? { jwks } : { key: sharedSecret, allowShortSecret: true }),
  };
}

/**
 * Verifies Supabase-issued access tokens. Supabase itself owns sign-up/
 * sign-in; this only checks who is calling and provisions the local User
 * row the first time we see a valid token for that id (see UsersService).
 */
@Injectable()
export class SupabaseAuthProvider extends JwtBearerProvider<AuthenticatedUser> {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super(buildOptions(config));
    registry.registerProvider(this);
  }

  async validate(claims: JwtClaims): Promise<AuthenticatedUser | null> {
    if (!claims.sub) return null;
    const appMetadata = claims.app_metadata as { role?: string } | undefined;
    const user = await this.users.ensureUser(claims.sub);
    if (user.status !== 'active') return null;
    return {
      id: user.id,
      role: appMetadata?.role === 'admin' ? 'admin' : 'user',
      aal: typeof claims.aal === 'string' ? claims.aal : null,
    };
  }
}
