# Drift

**Somewhere, someone feels the same.**

Drift is a global social discovery app where people share thoughts as floating bubbles in a
calm, animated universe, discover strangers with similar feelings, and form connections that
unlock private messaging only after mutual consent. Not a dating app — a space for genuine
human connection, built around thoughts rather than appearance.

## Project status
Phase 0 (Discovery & Planning) and Phase 1 (Design Foundation) are complete — the Expo app in
[`/mobile`](./mobile) has a working, on-device-verified bubble-universe prototype. Phase 2 (Core
Backend) is built in [`/api`](./api): Supabase-auth-verified NestJS API for profiles and thoughts,
tested end to end. See `DEVELOPMENT_PLAN.md` for exactly what's built versus still pending —
next up is creating a real Supabase project and wiring the mobile app to this API.

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
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage) + a thin custom NestJS TypeScript
  API for business logic (consent, moderation, admin, rate limiting).
- **Admin portal**: Next.js + TypeScript (not built yet).
- **Database**: PostgreSQL via Prisma.

## Running the mobile app
```
cd mobile
npm install
npm start
```
Then press `i`/`a` for a simulator, or scan the QR code with Expo Go on a physical device. The
Universe screen still shows sample thoughts — it isn't wired to the API yet.

## Running the backend
See [`api/README.md`](./api/README.md) — needs a local Postgres.

## Next step
Create a real Supabase project, then wire the mobile app's Universe/Create/Profile screens to
the `/api` backend instead of sample data.
