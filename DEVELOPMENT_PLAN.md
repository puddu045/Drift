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

## Phase 2 — Core Backend ✅ (backend + real Supabase) / 🔜 (wiring mobile to it)
- ✅ Prisma schema matching `ARCHITECTURE.md` §2, migrated against a local Postgres.
- ✅ Custom NestJS API (`/api`): Supabase JWT verification with lazy user provisioning, profile
  CRUD, thought create/discover/react/reply/report, rate limiting (60 req/min).
- ✅ Unit tests (mocked Prisma) + e2e tests (real HTTP requests against a test database) +
  lint, all passing. Verified by hand with signed test tokens: auth guard, validation errors,
  ownership checks, rate-limit 429s, soft delete, username conflicts.
- ✅ Seed script with clearly-labeled sample thoughts for local development.
- ✅ Real Supabase project created and auth verified end-to-end against it with a genuine
  Supabase-issued token (not just local test tokens) — see DECISIONS.md.
- 🔜 Not yet done: wiring the mobile app's Universe/Create/Profile screens to this API instead
  of sample data; Supabase client setup in the mobile app for session management; deciding
  whether to re-enable "Confirm email" on the Supabase project before real signups.

## Phase 3 — Connections ⏳
- Connection request lifecycle (send/accept/decline/withdraw/remove), one-shot intro message.
- Private messaging (conversations, messages, pagination, delivery state) gated on accepted
  connections.
- Push + in-app notifications for reactions, replies, requests, acceptances, messages.
- Block/mute, reporting flows end-to-end into the moderation queue.
- Destiny mode (simplified daily assignment).

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
