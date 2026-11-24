import { Policy, type PolicyBefore } from '@nestjs/authorization';

import type { AuthenticatedUser } from '../auth/current-user.js';

/**
 * Gates every admin route. `role` comes from the Supabase JWT's
 * `app_metadata.role` (server-only-writable — see SupabaseAuthProvider),
 * never from anything the user themselves can set.
 *
 * `before()` resolves every admin ability in one place: admins pass, anyone
 * else is denied outright before `manage` (or any future finer-grained
 * ability) ever runs.
 */
@Policy()
export class AdminPolicy implements PolicyBefore<AuthenticatedUser> {
  before(user: AuthenticatedUser | null) {
    return user?.role === 'admin' && user.aal === 'aal2';
  }

  manage(_user: AuthenticatedUser | null) {
    return false;
  }
}
