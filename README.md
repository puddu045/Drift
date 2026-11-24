# Drift

**Somewhere, someone feels the same.**

Drift is a global social discovery app where people share thoughts as floating bubbles in a
calm, animated universe, discover strangers with similar feelings, and form connections that
unlock private messaging only after mutual consent. Not a dating app — a space for genuine
human connection, built around thoughts rather than appearance.

## Project status
Phase 0, 1 and 2 are complete. [`/api`](./api) is a Supabase-auth-verified NestJS backend for
profiles and thoughts, tested against a real Supabase project. [`/mobile`](./mobile) is wired to
it: real sign-in, a real Universe feed, posting real thoughts, reactions/replies/report/delete.
Not yet verified: the wired app running live on a phone, since the backend only runs reachable
from the container this was built in right now — see `DECISIONS.md` "still open" for the two
ways to fix that. See `DEVELOPMENT_PLAN.md` for exactly what's built versus still pending.

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
Then press `i`/`a` for a simulator, or scan the QR code with Expo Go on a physical device. You'll
need a real account (the app has a minimal email/password sign-in/sign-up screen) and the API
running somewhere your device/simulator can reach — see `api/README.md` and `mobile/.env`.

## Running the backend
See [`api/README.md`](./api/README.md) — needs a local Postgres.

## Next step
Get the wired app actually running on a device: either run the API on the same network as the
test device, or deploy it (see `DECISIONS.md` "still open" for the trade-off).
