# Drift — Decision Log

This file is the single source of truth for product/technical decisions already approved.
Do not re-ask about anything recorded here unless the user explicitly reopens it.

## Confirmed by user (Phase 0 discovery, 2026-11-22)

| # | Topic | Decision |
|---|---|---|
| 1 | Identity model | Anonymous thoughts by default. Pseudonymous profile (display name, optional photo) exists but is only revealed at the user's choice, typically once a connection starts. |
| 2 | Bubble animation | Simple 2D floating animation (React Native Reanimated + Gesture Handler), not physics-engine or 3D. |
| 3 | Thought lifecycle | Thoughts persist indefinitely. Author can delete their own thought. No auto-expiry in MVP. |
| 4 | Messaging consent | Full private messaging only unlocks after mutual connection acceptance. A sender may attach **one** "intro message" to a connection request before it's accepted — no further messages until accepted. |
| 5 | Advanced features in MVP | **Destiny mode**: included, simplified (one random stranger thought per day, no matching algorithm). **Soul Echo**: deferred post-MVP. **Thought Journey**: deferred post-MVP. |
| 6 | Relationship intent | Lightweight optional profile preference (Friendship / Romance / Open to either / Just sharing), set in onboarding. Used only as a soft signal, never a hard filter or "dating app" style search in MVP. |
| 7 | Public replies | Single-level (flat), not threaded. |
| 8 | Reaction counts | Hidden from the public. Author can see their own thought's counts privately. |
| 9 | Mobile framework | React Native + Expo + TypeScript. |
| 10 | Backend approach | Supabase (managed Postgres, Auth, Realtime, Storage) **+** a thin custom NestJS/Fastify TypeScript API in front for business logic that needs real control: connection consent state machine, moderation, admin RBAC/audit logs. Prisma talks directly to Supabase's underlying Postgres. |
| 11 | Admin portal | Next.js + TypeScript (unchanged from original brief). |
| 12 | Hosting/budget | Low-cost / free-tier: Supabase free tier, Expo EAS for builds, a cheap/free host (Railway/Render/Fly.io class) for the custom API. |
| 13 | Monetization | No payments built in MVP, but data model/feature flags are structured so premium add-ons can be layered in later without a rework. |
| 14 | Visual palette | "Midnight Dreamscape": navy `#101A35`, deep blue `#24365E`, pastel blue `#A9C9F5`, lavender `#C8B7F0`, soft pink `#F2C7DA`, peach `#F4D1BD`, off-white `#F8F9FD`. |
| 15 | Repository state | Confirmed empty at discovery — Drift is a greenfield build, nothing existing to preserve. |

## Working assumptions (not yet explicitly asked — flagged for easy override)

These are minor/routine calls made to avoid over-asking (per project Rule 3). Say so if you want any of these changed; otherwise they stand.

- **Thought character limit**: 280 characters, adjustable later.
- **Mood selection**: Manual selection by the user from a fixed list (Love, Deep, Happy, Reflective, Hopeful, Random, Lonely, Curious); automatic mood suggestion is a possible future enhancement, not MVP.
- **Navigation structure**: Bottom tabs — Universe, Destiny, Create, Connections (includes messaging), Profile — matching the brief's suggestion.
- **Read receipts / typing indicators / voice notes / photos / video calls / disappearing or editable messages / translation**: none in MVP messaging; each is a distinct future ask, not bundled in automatically.
- **End-to-end encryption**: not implemented in MVP; messaging is server-authorized and encrypted in transit/at rest (TLS + database encryption), but not E2E. This will be stated accurately in any privacy policy — never claimed as E2E unless actually built.

## Implementation notes (Phase 2 — backend)

Routine technical refinements made while building `/api`, recorded so they aren't re-derived or
accidentally reversed later:

- **No `AuthIdentity` table.** Supabase Auth owns sign-up/sign-in and its own internal
  `auth.users`/`auth.identities` tables; we don't mirror them. Our `User.id` is always the same
  UUID as the Supabase-verified JWT's `sub` claim, and the local `User`/`UserProfile` row is
  created lazily the first time we see a valid token for that id (`UsersService.ensureUser`).
  This avoids a cross-schema Postgres trigger and keeps the schema portable.
- **Prisma 7, not an older Prisma.** Prisma 7 requires a driver adapter (`@prisma/adapter-pg`)
  and moved the database connection string out of `schema.prisma` into `prisma.config.ts` — a
  breaking change from what most Prisma docs/training data describe. Generated client lives at
  `api/src/generated/prisma` (inside `src/` so the Nest build's `rootDir` picks it up), gitignored.
- **JWT verification**: `@nestjs/authentication`'s `JwtBearerProvider` against Supabase's JWKS
  endpoint (modern projects) or `SUPABASE_JWT_SECRET` (legacy shared-secret projects) — whichever
  env var is set. Role for admin RBAC (Phase 4) will come from the JWT's `app_metadata.role`
  (server-only-writable), never `user_metadata`.
- **NestJS version**: significantly newer than typical training data — ESM-only, Vitest instead
  of Jest, `@nestjs/authentication`/`@nestjs/authorization` as the first-party auth packages
  (not hand-rolled Passport/JWT), Zod + `StandardSchemaValidationPipe` for validation instead of
  class-validator DTOs. See `api/AGENTS.md` and `api/.claude/skills/` before changing auth,
  validation, or data-layer code.
- **No `@nestjs/observe` telemetry.** The Nest scaffold wires up a third-party observability SaaS
  by default; removed since no one asked for it and it would otherwise start reporting data
  without an explicit decision to do so.
- **Local Postgres for development**, pointed at by `api/.env` (gitignored); production/staging
  points `DATABASE_URL` at the real Supabase project's Postgres once database migration there
  is needed (local Postgres still used for day-to-day dev — see below).
- **Real Supabase project created** (2026-11-24), in the `layo-production` org, project name
  "Drift", URL `https://rljolrhpywrrokrwvgrt.supabase.co`, modern ECC/JWKS signing keys (no
  legacy shared secret). Verified end-to-end: a real Supabase-issued token is correctly checked
  against its live JWKS endpoint and provisions a local `User` row.
- **Email provider testing state**: to test sign-in without hitting Supabase's free-tier email
  rate limit, "Confirm email" was turned off and a test user was created via the dashboard's
  "Add user" + "Auto Confirm User". **Revisit before any real signups are allowed** — decide
  whether email confirmation should be required (standard/recommended) and turn it back on.
- **Sandboxed dev environment quirk**: Node's built-in `fetch` doesn't read this container's
  `HTTPS_PROXY` by default, so the backend needs `NODE_USE_ENV_PROXY=1` set to reach Supabase's
  JWKS endpoint when run inside this particular cloud container. Not needed on a normal host
  with direct internet access (e.g. actual deployment, or most local dev machines).

## Still open (to revisit later, not blocking MVP start)

- Final app name/trademark/domain check.
- Final typography choice (will propose once real screens exist).
- Staging environment specifics.
- Whether to re-enable "Confirm email" on the Supabase project before real users sign up
  (currently off for test convenience — see above).
- Legal review of privacy policy / Online Safety Act / App Store & Play policy compliance (flagged as needing professional legal review, not something to self-certify).
- **How to test the wired mobile app against a live backend.** The API currently only runs
  reachable from the cloud container this was built in, not from a phone. Two options: (a) run
  the API locally on your own machine (same Wi-Fi as your phone), pointed at either a local
  Postgres or the real Supabase project's Postgres; (b) deploy it to the low-cost host chosen
  in decision #12 (Railway/Render/Fly.io class). (a) is faster to try right now; (b) is the
  real target eventually. Not yet decided which to do next.
