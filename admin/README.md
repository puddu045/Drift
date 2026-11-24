# Drift Admin

Internal admin/moderation portal for Drift. Talks to the same NestJS API (`/api`) and Supabase
project as the mobile app — see `/DEVELOPMENT_PLAN.md` Phase 4.

## Setup

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (same values the
# mobile app uses) and NEXT_PUBLIC_API_URL (the running /api server, default http://localhost:3000)
npm install
npm run dev
```

Runs on **http://localhost:3001** (not 3000 — that's the API) by default.

## Granting yourself admin access

Access is gated on the Supabase JWT's `app_metadata.role` claim, which only a service-role
call (not the regular client SDK, and not the user themselves) can set. In the Supabase
dashboard, **SQL Editor**, run:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
where email = 'you@example.com';
```

Sign out and back in (or just sign in) afterward so a fresh token picks up the claim.

## MFA is mandatory for every admin account

The first time an admin-role account signs in here, it's walked through enrolling a TOTP
authenticator (any standard authenticator app — Google Authenticator, 1Password, Authy, etc.).
On every later sign-in, it's prompted for a 6-digit code. This is enforced both here
(`supabase.auth.mfa.*`) and by the API itself (it checks the token's `aal` claim, not just role)
— there's no way to reach any admin page or endpoint without clearing it, regardless of role.

**To skip this temporarily** (e.g. while first setting things up locally), set
`NEXT_PUBLIC_REQUIRE_ADMIN_MFA=false` here in `.env.local` **and**
`REQUIRE_ADMIN_MFA=false` in `/api`'s `.env`, then restart both. The role check still applies —
this only drops the MFA step. Remove both when you're done; nothing re-enables it automatically.
