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
 *
 * REQUIRE_ADMIN_MFA=false skips the aal2 check — a temporary, explicit
 * opt-out for local setup, not a default. Unset (or anything else) keeps MFA
 * required, matching what the admin portal's own UI enforces.
 */
@Policy()
export class AdminPolicy implements PolicyBefore<AuthenticatedUser> {
  before(user: AuthenticatedUser | null) {
    if (user?.role !== 'admin') return false;
    if (process.env.REQUIRE_ADMIN_MFA === 'false') return true;
    return user.aal === 'aal2';
  }

  manage(_user: AuthenticatedUser | null) {
    return false;
  }
}
