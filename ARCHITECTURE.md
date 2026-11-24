# Drift — Technical Architecture

See `DECISIONS.md` for the approved stack choices this document implements.

## 1. High-level components

```
┌─────────────────┐      ┌──────────────────────┐      ┌───────────────┐
│  Mobile app      │◄────►│  Custom API           │◄────►│  Supabase      │
│  (Expo / RN / TS)│      │  (NestJS, Express, TS)│      │  Postgres/Auth │
└─────────────────┘      └──────────────────────┘      │  Realtime/     │
         ▲                         ▲                    │  Storage       │
         │ Supabase client SDK      │ Prisma             └───────────────┘
         │ (auth session, realtime) │ (same Postgres)            ▲
         ▼                         ▼                             │
┌─────────────────┐      ┌──────────────────────┐                │
│  Admin portal    │◄────►│  Custom API (shared)  │────────────────┘
│  (Next.js / TS)  │      └──────────────────────┘
└─────────────────┘
```

- **Mobile app**: all user-facing product surfaces (universe, composer, connections, messaging,
  Destiny, profile). Talks to the custom API for anything business-rule-sensitive, and directly
  to Supabase for auth session management and realtime subscriptions (new reaction, new message)
  once authorized.
- **Custom API**: owns the rules nothing else should bypass — connection consent state machine,
  moderation actions, rate limiting, admin RBAC + audit log, notification fan-out. Uses Prisma
  against Supabase's Postgres (it's plain Postgres, no lock-in on the data layer).
- **Supabase**: managed Postgres, Auth (email + Apple/Google sign-in), Realtime (change-stream
  based live updates), Storage (profile photos). Chosen to cut build time/cost on infra that
  doesn't need custom behavior.
- **Admin portal**: Next.js, talks to the custom API (never directly to Supabase with elevated
  rights) so every admin action goes through RBAC + audit logging.

## 2. Data model (entities)

Implemented in `/api/prisma/schema.prisma`. Core entities, aligned with the brief, adjusted for
the approved consent model:

- `User` (no separate `AuthIdentity` table — Supabase Auth owns identity; see DECISIONS.md),
  `UserProfile`, `UserPreferences`
- `Interest`, `UserInterest`
- `Thought`, `ThoughtReaction`, `ThoughtReply` (flat, `thoughtId` FK only — no parent-reply nesting)
- `ConnectionRequest` (status: pending/accepted/declined/withdrawn, optional `introMessage` text,
  one-shot — enforced server-side so no follow-up messages before acceptance)
- `Connection` (exists once mutually accepted; soft-deletable on removal)
- `Conversation`, `ConversationParticipant`, `Message` (only creatable where an active `Connection`
  exists)
- `Notification`, `DeviceToken`
- `Block`, `Report`, `ModerationAction`
- `DestinyAssignment` (per-user, per-day record of which thought was surfaced, to enforce the
  once-per-day rule and avoid repeats)
- `FeatureFlag`, `AuditLog` (admin actions)

All tables: UUID primary keys, `createdAt`/`updatedAt`, soft-delete (`deletedAt`) where content
removal needs to be reversible/auditable (thoughts, replies, accounts), hard rows for append-only
logs (AuditLog, ModerationAction).

## 3. API surface (grouped)

- **Auth**: handled mostly by Supabase Auth; custom API issues/validates its own session check
  against Supabase JWT on every request.
- **Profile**: get/update own profile, get public-safe profile view of another user (respecting
  their privacy settings).
- **Thoughts**: create, get feed/discovery page (cursor-paginated), get one, delete own, react,
  reply, report.
- **Connections**: send request (+ optional intro message), accept/decline/withdraw, remove,
  list own connections/pending requests.
- **Messaging**: list conversations, get messages (paginated), send message — all gated on an
  active `Connection` row, checked server-side on every call.
- **Destiny**: get today's assignment (creates one if none exists yet today), reply.
- **Notifications**: list, mark read, update category preferences.
- **Safety**: block, unblock, report (thought/reply/profile/message/conversation).
- **Admin**: dashboard metrics, user search/suspend/ban, moderation queue, moderation actions,
  feature flag config, audit log — all RBAC-checked, never exposing raw message content to
  non-authorized roles without a recorded, reason-logged access.

## 4. Real-time strategy

- Live universe updates (new thoughts appearing) and messaging delivery use Supabase Realtime
  (Postgres change streams) for push, since the custom API already writes through the same
  Postgres — no separate WebSocket server needed initially.
- Every realtime subscription is scoped so a client can only receive rows it's authorized to see
  (e.g., messages only within its own conversations). If Supabase's authorization model proves
  insufficient for a specific case, fall back to a dedicated authenticated WebSocket gateway in
  the custom API for that case — not a wholesale rebuild.

## 5. Security & privacy baseline
- Every mutating action re-validated server-side (never trust client-side gating).
- No endpoint returns another user's private profile fields, exact location, or message content
  outside an authorized participant/admin context.
- Admin access: role-based, MFA required, session timeouts, full audit log of moderation/account
  actions; ordinary admins cannot bulk-browse private messages — access requires a logged reason
  tied to an active report.
- Rate limiting on thought creation, replies, connection requests, and messages to curb spam/abuse.
- Secrets via environment variables / the hosting platform's secret store — never committed.

## 6. Hosting (low-cost MVP tier, per decision #12)
- Supabase free/low tier for Postgres, Auth, Realtime, Storage.
- Custom API on a low-cost Node host (Railway/Render/Fly.io class).
- Admin portal on the same class of host or Vercel (Next.js-native).
- Expo EAS for iOS/Android builds and OTA updates.
- Plan assumes this scales by upgrading tiers, not by re-architecting, as usage grows.

## 7. Open technical questions (non-blocking, to resolve during Phase 3)
- Exact realtime authorization pattern (RLS vs. custom channel scoping) — will prototype against
  the messaging use case first since it's the highest-stakes for privacy.
- Push notification provider (Expo push service initially, since it's free and integrates
  directly with EAS).

## 8. Implementation status
Phase 2 backend (`/api`) is built and tested: Supabase JWT verification with lazy user
provisioning, profile CRUD, thought create/discover/react/reply/report, and rate limiting — all
verified against a local Postgres with real HTTP requests (unit + e2e tests, see `api/README.md`).
A real Supabase project now exists and auth has been verified end-to-end against it with a real
Supabase-issued token (see DECISIONS.md), not just locally-signed test tokens. Connections,
messaging, Destiny, notifications, blocking, and the admin portal are Phase 3/4 and not yet built.
The mobile app still isn't wired to this backend — Universe still shows sample data.
