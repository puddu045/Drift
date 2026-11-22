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

## Still open (to revisit later, not blocking MVP start)

- Final app name/trademark/domain check.
- Final typography choice (will propose once real screens exist).
- Staging environment specifics.
- Legal review of privacy policy / Online Safety Act / App Store & Play policy compliance (flagged as needing professional legal review, not something to self-certify).
