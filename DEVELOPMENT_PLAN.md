# Drift — Phased Development Plan

Status key: ✅ done · 🔜 next · ⏳ later

## Phase 0 — Discovery and Planning ✅
- Inspected repository (confirmed empty/greenfield).
- Captured product, UX, privacy, connection, technical, budget decisions (`DECISIONS.md`).
- Produced `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`.

## Phase 1 — Design Foundation 🔜 (in progress)
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
- 🔜 Not yet done: text/number input fields, in-browser/device visual QA (no simulator in this
  environment — needs a run on an actual iOS/Android target or Expo Go), final typography pick,
  light-mode variant.
- Review checkpoint with user before moving to backend work.

## Phase 2 — Core Backend ⏳
- Supabase project setup (Postgres, Auth, Storage, Realtime) + Prisma schema matching
  `ARCHITECTURE.md` §2.
- Custom NestJS/Fastify API: auth session validation, profile CRUD, thought create/discover/
  react/reply/report, rate limiting basics.
- Wire mobile app's composer, universe, and thought detail screens to real data.
- Seed data for local development (clearly labeled as sample/test content).

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
