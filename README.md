# Drift

**Somewhere, someone feels the same.**

Drift is a global social discovery app where people share thoughts as floating bubbles in a
calm, animated universe, discover strangers with similar feelings, and form connections that
unlock private messaging only after mutual consent. Not a dating app — a space for genuine
human connection, built around thoughts rather than appearance.

## Project status
Phase 0 (Discovery & Planning) complete. No application code yet — this phase produced the
approved product/technical plan. See the documents below before starting any implementation
work.

## Project documents
- [`DECISIONS.md`](./DECISIONS.md) — approved product/technical decisions (check here before
  re-raising something that's already settled).
- [`PRODUCT_REQUIREMENTS.md`](./PRODUCT_REQUIREMENTS.md) — MVP scope and core user flows.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — tech stack, data model, API surface, real-time
  strategy, security baseline.
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — color palette, typography, navigation, bubble
  visual spec, accessibility baseline.
- [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) — phased build plan with current status.
- [`TEST_PLAN.md`](./TEST_PLAN.md) — testing strategy per phase.

## Tech stack (approved)
- **Mobile**: React Native + Expo + TypeScript.
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage) + a thin custom NestJS/Fastify
  TypeScript API for business logic (consent, moderation, admin, rate limiting).
- **Admin portal**: Next.js + TypeScript.
- **Database**: PostgreSQL via Prisma.

## Next step
Phase 1 (Design Foundation): Expo project scaffold, design system implementation, and a
bubble-animation prototype using sample data — pending your go-ahead.
