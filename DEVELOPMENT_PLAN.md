# Drift — Phased Development Plan

Status key: ✅ done · 🔜 next · ⏳ later

## Phase 0 — Discovery and Planning ✅
- Inspected repository (confirmed empty/greenfield).
- Captured product, UX, privacy, connection, technical, budget decisions (`DECISIONS.md`).
- Produced `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`.

## Phase 1 — Design Foundation ✅
- ✅ Expo + TypeScript project scaffold at `/mobile`, using Expo Router (`src/app`), Reanimated,
  and Gesture Handler, per `ARCHITECTURE.md`.
- ✅ Design tokens implemented (`src/theme`): Midnight Dreamscape palette, typography, spacing.
- ✅ Base components: `Button`, `Card`, `MoodTag`, `ScreenContainer`, `PlaceholderScreen`.
- ✅ Bubble universe prototype (`src/features/universe`): 2D drifting bubbles over sample
  thoughts, tap-to-expand detail overlay with reactions/reply/connect UI (visual only, not
  wired to a backend yet), reduced-motion support. Sample data is clearly labeled as such.
- ✅ Navigation shell: Universe/Destiny/Create/Connections/Profile tabs — Universe is fully
  built, the other four are labeled placeholders pending their phase.
- ✅ Typecheck, lint, and a Metro bundle export all pass clean.
- ✅ Visually verified on a real device (Expo Go) — bubbles drift and the tap-to-expand overlay
  work as intended. User approved moving to Phase 2.
- Still not done (not blocking): text/number input fields, final typography pick, light-mode
  variant — will come up naturally once Create/Profile screens are built against real data.

## Phase 2 — Core Backend ✅
- ✅ Prisma schema matching `ARCHITECTURE.md` §2, migrated against a local Postgres.
- ✅ Custom NestJS API (`/api`): Supabase JWT verification with lazy user provisioning, profile
  CRUD, thought create/discover/react/reply/report, rate limiting (60 req/min).
- ✅ Unit tests (mocked Prisma) + e2e tests (real HTTP requests against a test database) +
  lint, all passing. Verified by hand with signed test tokens: auth guard, validation errors,
  ownership checks, rate-limit 429s, soft delete, username conflicts.
- ✅ Seed script with clearly-labeled sample thoughts for local development.
- ✅ Real Supabase project created and auth verified end-to-end against it with a genuine
  Supabase-issued token (not just local test tokens) — see DECISIONS.md.
- ✅ Mobile app wired to the API (`/mobile`): Supabase client with session persistence, a
  minimal email/password auth screen (not the full onboarding flow — see code comment),
  Universe fetching real thoughts, Create posting real thoughts, thought detail overlay with
  real reactions/replies/report/delete, Profile view/edit. Typecheck, lint, and a Metro bundle
  export all pass clean.
- ✅ **Verified live on a physical device** (2026-11-24): API running on the user's own machine
  against the real Supabase Postgres, mobile app on their phone over the same Wi-Fi. Signed up a
  real account, posted two real thoughts through Create, and saw them appear as bubbles in
  Universe fetched from the live backend — the full loop works end to end.
- Still open: deciding whether to re-enable "Confirm email" on the Supabase project before real
  signups; a real deployment (vs. running the API on a personal machine) for anything beyond
  active development.

**Phase 2 is functionally complete and proven to work live.** Ready to move to Phase 3
(Connections: requests, private messaging, notifications, block/mute, Destiny) whenever
approved.

## Phase 3 — Connections ✅
- ✅ Backend (`/api`): connection request lifecycle (send/accept/decline/withdraw/remove, one-
  shot intro message, blocks re-requests after a decline), messaging (gated on an active
  connection, checked per call), in-app notifications (+ best-effort Expo push if a device token
  is registered — no mobile capture flow for that yet, scope cut), Destiny (idempotent daily
  pick), blocks (now also severs any existing connection, caught during manual testing).
- ✅ Mobile (`/mobile`): Connections tab (incoming requests with accept/decline, connection list)
  with a nested chat screen; Destiny tab; Connect/Report/Block actions on thought detail;
  minimal Notifications screen (reachable from Profile).
- ✅ Verified by hand: full request → accept → message flow, Destiny idempotency, block
  severing an existing connection. Typecheck, lint, unit + e2e tests, and a Metro bundle export
  all pass clean.
- Not done: mute (separate from block — not built), moderation queue UI (that's Phase 4's admin
  portal), actual push notification delivery (needs a mobile permission/token-capture flow),
  visual verification of the Phase 3 mobile screens on a device (code-complete, not yet seen
  running).

## Phase 4 — Admin and Safety ⏳
- Admin portal (Next.js): dashboard, user management, moderation queue, audit log, feature flags.
- RBAC + MFA for admin accounts.
- Security hardening pass on all endpoints (authz checks, input validation, abuse limits).

## Phase 5 — Testing and Beta ⏳
- Automated unit/integration tests per `TEST_PLAN.md`.
- Manual device matrix pass (iOS/Android, slow network, offline, backgrounding).
- Performance pass on bubble rendering under load.
- TestFlight + Android internal testing rollout, feedback loop.

## Phase 6 — Launch Preparation ⏳
- App Store / Play Store listing requirements.
- Privacy policy / Terms of Service (flagged for professional legal review, not self-certified).
- Production environment hardening, monitoring, error tracking, release checklist.

## Working principle for every phase
1. Explain what will be built and flag any decision that needs approval.
2. Wait for approval where a decision materially affects product/UX/privacy/cost.
3. Implement the approved scope.
4. Run available automated tests.
5. Report what was completed, what's mocked vs. real, and what remains.
6. Recommend the next step.
