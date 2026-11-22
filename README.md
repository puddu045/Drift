# Drift

**Somewhere, someone feels the same.**

Drift is a global social discovery app where people share thoughts as floating bubbles in a
calm, animated universe, discover strangers with similar feelings, and form connections that
unlock private messaging only after mutual consent. Not a dating app — a space for genuine
human connection, built around thoughts rather than appearance.

## Project status
Phase 0 (Discovery & Planning) complete. Phase 1 (Design Foundation) is in progress: the Expo
app scaffold, design system, and a working bubble-universe prototype live in [`/mobile`](./mobile)
— see `DEVELOPMENT_PLAN.md` for exactly what's built versus still pending.

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

## Running the mobile app
```
cd mobile
npm install
npm start
```
Then press `i`/`a` for a simulator, or scan the QR code with Expo Go on a physical device.
There's no backend yet — the Universe screen shows sample thoughts only.

## Next step
Visual QA of the Phase 1 prototype on an actual device/simulator (not available in the
container this was built in), then moving on to Phase 2 (Core Backend) once reviewed.
