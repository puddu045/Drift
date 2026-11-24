// The shape @CurrentUser() resolves to for every authenticated request, once
// SupabaseAuthProvider has verified the token and (if needed) provisioned the
// local User row. `role` comes from Supabase's `app_metadata` (server-only
// writable), never `user_metadata` (user-writable) — see DECISIONS.md.
// `aal` is the token's Authenticator Assurance Level ('aal2' only once the
// session has passed an MFA challenge) — AdminPolicy requires it alongside
// role so a leaked/replayed admin token without MFA still can't reach
// /admin/*, matching what the admin portal's UI already enforces.
export type AuthenticatedUser = {
  id: string;
  role: 'user' | 'admin';
  aal: string | null;
};

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: AuthenticatedUser;
  }
}
