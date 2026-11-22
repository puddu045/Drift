# Drift API

The custom backend from `/ARCHITECTURE.md`: NestJS (ESM, Vitest), Prisma 7 against Postgres
(Supabase in staging/production, a local Postgres for development), Supabase-issued JWTs
verified via `@nestjs/authentication`, Zod validation, and `@nestjs/throttler` rate limiting.

Builds on NestJS's own scaffold — see `AGENTS.md` and `.claude/skills/` for version-specific
conventions (ESM import extensions, Zod + `StandardSchemaValidationPipe`, etc.) before changing
anything here; this Nest version is newer than most training data and has changed significantly
(ESM-only, ` @nestjs/authentication`/`@nestjs/authorization` as the standard auth packages,
Prisma 7's driver-adapter + `prisma.config.ts` setup).

## What's built (Phase 2 scope)

- Supabase JWT verification (`src/auth`) — every route requires a valid Supabase access token by
  default; the local `User` row is provisioned lazily from the verified token's `sub` claim (see
  the comment at the top of `prisma/schema.prisma` for why there's no separate sync step).
- Profiles (`src/users`): get/update your own profile, view another user's public-safe profile.
- Thoughts (`src/thoughts`): create, cursor-paginated discovery feed, get one, delete your own,
  toggle a reaction, reply, and report (thought/reply/profile).
- Rate limiting: 60 requests/minute per client by default (`@nestjs/throttler`).

Not built yet (later phases per `/DEVELOPMENT_PLAN.md`): connections, messaging, Destiny,
notifications, blocking, and the admin portal/RBAC.

## Local development

Requires a local Postgres (this was built and tested against Postgres 16).

```bash
cp .env.example .env     # fill in DATABASE_URL for your local Postgres
npm install
npx prisma migrate dev   # creates/updates the schema
npx prisma db seed       # optional: adds a few sample thoughts, clearly not real users
npm run start:dev
```

For `SUPABASE_URL`/`SUPABASE_JWKS_URL`/`SUPABASE_JWT_SECRET`: these only matter once a real
Supabase project exists (not yet created — see `/DECISIONS.md`). Until then, requests need a
token signed with a test value of `SUPABASE_JWT_SECRET` to pass authentication locally.

## Tests

```bash
npm test       # unit tests (mocked Prisma) — no database needed
npm run test:e2e  # real HTTP requests against a dedicated test database
```

The e2e suite expects a `drift_test` Postgres database with migrations applied:

```bash
sudo -u postgres psql -c "CREATE DATABASE drift_test OWNER drift;"
DATABASE_URL="postgresql://drift:drift_dev_password@localhost:5432/drift_test" npx prisma migrate deploy
```

Before finishing any change: `npm run build`, `npm test`, `npm run test:e2e`, `npm run lint`.
