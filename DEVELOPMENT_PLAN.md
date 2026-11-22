# Drift — Phased Development Plan

Status key: ✅ done · 🔜 next · ⏳ later

## Phase 0 — Discovery and Planning ✅
- Inspected repository (confirmed empty/greenfield).
- Captured product, UX, privacy, connection, technical, budget decisions (`DECISIONS.md`).
- Produced `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`.
- **Gate: waiting on user approval of this plan before any implementation begins.**

## Phase 1 — Design Foundation 🔜
- Expo + TypeScript project scaffold (mobile app skeleton, no backend calls yet).
- Design system implementation: color tokens, typography, spacing, base components
  (button, input, card, mood tag, bubble shell).
- Bubble animation prototype (2D drifting, tap-to-expand) with mock/sample thought data only —
  clearly labeled sample content, no real backend yet.
- Navigation shell (Universe/Destiny/Create/Connections/Profile tabs).
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
