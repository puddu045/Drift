// The shape @CurrentUser() resolves to for every authenticated request, once
// SupabaseAuthProvider has verified the token and (if needed) provisioned the
// local User row. `role` comes from Supabase's `app_metadata` (server-only
// writable), never `user_metadata` (user-writable) — see DECISIONS.md.
export type AuthenticatedUser = {
  id: string;
  role: 'user' | 'admin';
};

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: AuthenticatedUser;
  }
}
