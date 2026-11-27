# Drift Security Audit

Scope: full codebase (api/, mobile/, admin/), using OWASP Top 10, OWASP API Security Top 10, and OWASP MASVS as baselines. Investigation was done by reading the actual implementation (controllers, services, Prisma schema, mobile storage/auth code, admin portal config) and cross-checking findings across independent passes before fixing anything. Fixes were implemented, typechecked, linted, and covered by unit/e2e tests — this is not a recommendations-only report.

**This app is not "fully secure."** Several Critical/High findings are fixed and verified below; several items remain that need a human decision or access this repo doesn't have (Supabase/Render dashboard settings, a product decision on account deletion). Those are listed explicitly under *Manual actions required* and *Remaining risks* — treat anything not in the "Fixed" section as unresolved.

## Fixed — Critical/High

### 1. Anonymous-content deanonymization via leaked `authorId` (IDOR / excessive data exposure)
- **File**: `api/src/thoughts/thoughts.service.ts`, `getOne()`.
- **Evidence**: The method used Prisma `include` + object spread (`{ ...thought, author, replies: ... }`), which put the raw `authorId` (a real Supabase user UUID) into every thought/reply response — even for authors who had **not** opted into `showIdentityOnContent` (DECISIONS.md #1: anonymous by default). `GET /profiles/:userId` has no gating of its own (it's a deliberately public lookup for *known* ids — connections, revealed authors, search). Combining the two let anyone read an "anonymous" thought, grab its raw `authorId`, and call `GET /profiles/:userId` directly to fully deanonymize the author (displayName, username, photo, bio), completely bypassing the app's core privacy promise. A malicious client doing this bypasses the mobile UI entirely (which already gated profile navigation correctly) — the leak was in the API response, not the UI.
- **Fix**: `getOne()` now omits `authorId` from the response unless the author opted into identity reveal or it's the viewer's own thought/reply; added an explicit `isOwnThought` field so the client doesn't need the raw id for that check. Mobile (`mobile/src/features/thoughts/api.ts`, `ThoughtDetailOverlay.tsx`) updated: `authorId` is now optional; Connect/Mute/Block on an anonymous author show "This person has chosen to stay anonymous" instead of silently failing (a deliberate, minor UX trade-off — those three actions can no longer target an author whose identity the client was never supposed to know).
- **Tests**: 3 new unit tests (strips id for anonymous author; keeps id when opted in; keeps id for own content) — pass.

### 2. Mobile auth session stored in plaintext (insecure data storage — MASVS)
- **File**: `mobile/src/lib/supabase.ts`.
- **Evidence**: Supabase client used `@react-native-async-storage/async-storage` directly for `auth.storage` — the full session (access JWT, refresh token, user object) was persisted unencrypted, readable via device-backup extraction or on a rooted/jailbroken device with no need to defeat any encryption.
- **Fix**: new `mobile/src/lib/secureSessionStorage.ts` — per-write AES-256-GCM encryption via `expo-crypto`'s native `AESEncryptionKey`/`aesEncryptAsync`/`aesDecryptAsync` (official Expo SDK, no third-party crypto dependency), with the AES key stored in `expo-secure-store` (iOS Keychain / Android Keystore) and only the (opaque) ciphertext in AsyncStorage — SecureStore alone can't hold the full session blob on some iOS versions (~2KB practical limit, confirmed against Expo's current docs). Added `expo-secure-store` and `expo-crypto` via `npx expo install` (SDK-compatible versions).
- **Side effect (expected, one-time)**: existing signed-in users are signed out once after this update ships, since the new adapter can't read the old plaintext entry. Acceptable trade-off for moving a real auth token out of unencrypted storage.
- **Tests**: mobile typecheck/lint pass; no dedicated unit test added (no existing test harness for this module in mobile/) — flagged under Remaining risks.

### 3. Missing security headers (`helmet`)
- **File**: `api/src/configure-app.ts`.
- **Evidence**: No `helmet` or equivalent — zero CSP/HSTS/X-Content-Type-Options/X-Frame-Options anywhere in the API. Confirmed independently by two separate audit passes.
- **Fix**: added `helmet()` (CSP/COEP disabled — this is a pure JSON API that never serves HTML, so those two are no-ops; HSTS, X-Content-Type-Options, etc. remain active).

## Fixed — Medium

### 4. Blocked-user bypass via direct API calls
- **Files**: `api/src/users/users.service.ts` (`getPublicProfile`, `translateBio`), `api/src/thoughts/thoughts.service.ts` (`toggleReaction`, `reply`).
- **Evidence**: `BlocksService.isBlockedEitherWay` was already used correctly in `connections.service.ts` and `listPublicThoughtsByAuthor`, but **not** in these four paths — a blocked user could still view the blocker's full public profile, request bio translation, react to, or reply on a thought they already had the id for, fully bypassing the block relationship.
- **Fix**: wired `BlocksModule` into `UsersModule` and `ThoughtsModule`; added `isBlockedEitherWay` checks to all four methods (403/404, consistent with the existing pattern).
- **Tests**: 4 new unit tests (2 in each spec file) — pass.

### 5. No per-route throttle on paid/quota-backed translation endpoints
- **Files**: `api/src/thoughts/thoughts.controller.ts` (`translate`, `replies/:replyId/translate`), `api/src/users/users.controller.ts` (`translate-bio`).
- **Evidence**: Only the app-wide 60 req/60s limit applied; one account could call these ~60×/min indefinitely, each call spending the *shared, global* monthly Google Translate character quota (financial/quota-exhaustion abuse — OWASP API4, audit section 9).
- **Fix**: `@Throttle({ default: { limit: 10, ttl: 60_000 } })` on all three routes, mirroring the existing pattern on `connections`/`reports`.

### 6. Translation quota race condition (TOCTOU, cost-control bypass)
- **File**: `api/src/translation/translation.service.ts`, `reserveQuota()`.
- **Evidence**: Read-check-then-write (`findUnique` → compare → `upsert increment`) — concurrent translate requests near the monthly cap could all pass the check before any write landed, overshooting the configured budget (bounded per-chunk, but a real gap).
- **Fix**: kept the fast-path read for the already-over-limit case (no wasted write), but the actual increment is now a single conditional `updateMany({ where: { month, characterCount: { lt: limit } }, data: { characterCount: { increment } } })` — Prisma Client API, not raw SQL, so the "no raw SQL anywhere" property of the codebase is preserved. Two concurrent calls can no longer both pass a check and both write past budget.
- **Tests**: existing quota tests updated to match (asserting on `updateMany` instead of `upsert` for the increment); all pass.

## Fixed — Low

### 7. Admin portal missing security headers
- **File**: `admin/next.config.ts`.
- **Fix**: added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` via `headers()`. Defense-in-depth only — real authorization is already enforced server-side by the API's `AdminPolicy`, not by anything in the admin portal itself.

## Verified safe (no change needed)

- **Injection**: no `$queryRaw`/`$executeRaw(Unsafe)` anywhere in `api/src` before this audit (pure Prisma Client, parameterized); the one raw-SQL draft considered for fix #6 was deliberately replaced with Prisma's own API to keep that true. No `child_process`/`exec`/`spawn` usage anywhere. No server-side HTML rendering of user content (pure JSON API) — no XSS surface there.
- **SSRF**: only two outbound `fetch` calls in the whole backend, both to hardcoded URLs (Expo push, Google Translate) — no user-controlled host anywhere.
- **Input validation**: Zod schemas via `@Body({ schema })`/`@Param({ schema })` used consistently; spot-checked schemas use explicit field allowlists, no mass-assignment vector found (no schema passes through `role`/`id`/`authorId` etc. from client input).
- **CORS**: explicit origin allowlist from `CORS_ORIGINS` env, not a wildcard; no `credentials: true` misconfiguration.
- **JWT validation**: issuer/audience pinned, JWKS preferred over shared secret, delegated to the maintained `@nestjs/authentication` library (no custom parsing, no `alg: none` risk); `user.status === 'active'` re-checked on every request.
- **No unauthenticated routes**: the global auth guard denies by default; no `@Public()` decorator used anywhere in the app.
- **Admin RBAC**: all 5 admin controllers apply `AuthorizationGuard` + `@Can(AdminPolicy, 'manage')`; `AdminPolicy` default-denies non-admins and requires `aal2` MFA unless explicitly disabled via env.
- **IDOR elsewhere**: connections (sender/recipient/participant checks on every mutation), private messages (`requireActiveParticipant` does a unique `(conversationId, userId)` lookup — a non-participant gets 404, not data, and can't guess another user's conversation id), notifications (`markRead` scoped by `userId` in the `where`) — all verified correct.
- **Reporting**: rate-limited (10/60s, tighter than default); reporter identity is never exposed to the reported user.
- **No debug/API-docs exposure**: no Swagger/OpenAPI UI mounted anywhere.
- **Error handling**: no custom exception filter exists, but NestJS's own default filter never leaks stack traces or internal messages for unhandled exceptions, in any `NODE_ENV`.
- **Logging**: no `console.*`/logger call anywhere in `api/src` logs passwords, tokens, JWTs, or full request bodies.
- **Secrets**: no tracked `.env` with real secrets (`api/.env`, `admin/.env.local` are gitignored; `mobile/.env` is tracked but intentionally contains only `EXPO_PUBLIC_*` values — public by design, protected by backend/RLS, not secrecy). Full `git log --all -p` scan for credential patterns found nothing beyond a known-safe local dev placeholder.
- **Transactions**: `connections.service.ts`'s accept-request flow (status update + connection + conversation creation) correctly uses `$transaction`.
- **Mobile**: only the intentionally-public Supabase anon/publishable key and API base URL are embedded (no service-role or other real secret in the bundle); no deep-link handling exists at all (zero attack surface there); no `console.*`/`__DEV__` debug paths; HTTPS enforced for both API and Supabase URLs, no TLS-bypass code found anywhere.
- **Admin portal**: no `dangerouslySetInnerHTML` in application code.

## Remaining risks (not fixed — scope, access, or product decisions)

| # | Item | Severity | Why not fixed here |
|---|---|---|---|
| 1 | No account-deletion / personal-data-removal endpoint exists anywhere (backend or mobile) | Informational (compliance gap, not an exploit) | Needs a product decision (hard delete vs. anonymize thoughts/replies/messages) and, for full removal, deleting the underlying Supabase Auth user needs a **service-role key not currently present in this repo** — adding/rotating credentials requires your explicit approval per your own standing instructions. Flagging rather than silently adding a new secret. |
| 2 | DB connection TLS enforcement not verified | Low | `PrismaService` passes `DATABASE_URL` straight through with no explicit `ssl` option; whether the connection is actually encrypted depends on the deployed connection string (Render/Supabase), not visible from this repo. |
| 3 | Avatar/media upload validation | Informational | Uploads go directly mobile → Supabase Storage, bypassing the API entirely; file-type/size enforcement depends entirely on Supabase Storage bucket policy, not reviewable from this repo. |
| 4 | Brute-force/credential-stuffing protection on login | Informational | Login is `supabase.auth.signInWithPassword` called directly from the mobile client — there's no backend login endpoint to rate-limit; protection is Supabase's own dashboard settings. |
| 5 | No backend session/token revocation list | Low (accepted, by design) | Stateless JWT verification (JWKS) means a stolen access token is valid until natural expiry (~1h default). Normal for this architecture; noted, not a bug. |
| 6 | Dependency advisories: `prisma` CLI (`effect` ReDoS) and `@nestjs/mau`'s `tmp`/`inquirer`/`undici` chain | Low | Both are build/CLI tooling, not invoked by the running HTTP server — not reachable via any API request. No non-breaking fix exists (`npm audit fix --force` forces a breaking major downgrade of `prisma` or `@nestjs/mau`). Revisit at the next routine major-version bump. |
| 7 | No Dockerfile/CI config in-repo; Render deployment config not reviewable here | Informational | Deployment is configured entirely in Render's dashboard, outside this repository. |
| 8 | `getOne()`/translate-by-id not re-checked for the same blocked-user-bypass pattern as `toggleReaction`/`reply` | Low | Only those two were confirmed and fixed; viewing (not acting on) a thought from someone who's blocked you is a smaller concern, but wasn't independently verified either way — worth a follow-up pass. |
| 9 | DB least-privilege role configuration | Informational | Entirely managed by Supabase's hosted Postgres, not visible/changeable from this repo. |
| 10 | Mobile secure-storage change has no dedicated automated test | Low | No existing mobile test harness to extend; verified via typecheck/lint and manual code review only. |

## Manual actions required

1. Confirm production `DATABASE_URL` (Render/Supabase) includes `sslmode=require` or equivalent.
2. Confirm the Supabase Storage `avatars` bucket enforces file-size/MIME-type limits server-side (policy/RLS), not just the client-asserted `contentType`.
3. Confirm Supabase Auth dashboard rate-limiting/CAPTCHA settings are configured for this project (login brute-force protection).
4. Decide on and resource an account-deletion feature; if full Supabase Auth user deletion is wanted, a service-role key will need to be added — that's a credential addition requiring your explicit sign-off.
5. Review Render's build/start command and environment variables directly (not visible from this repo).
6. Mobile users will be signed out once after this update ships (expected consequence of fix #2) — no action needed, just worth knowing before release.

## Test results

| Check | Result |
|---|---|
| API unit tests (`vitest run src`) | **88 passed**, 0 failed (80 pre-existing + 8 new security regression tests) |
| API e2e tests (`npm run test:e2e`) | **24 passed**, 0 failed |
| API typecheck (`tsc --noEmit`) | clean |
| API lint (`oxlint --type-aware`) | clean |
| Mobile typecheck (`tsc --noEmit`) | clean |
| Mobile lint (`expo lint`) | clean |
| Admin lint (`eslint`) | clean |
| Admin build (`next build`) | succeeds, all 6 routes build/prerender |
| `npm audit` — api/ | 8 advisories, all in build/CLI-only transitive deps (prisma CLI, `@nestjs/mau`'s chain) — not reachable from the running server (see Remaining risks #6) |
| `npm audit` — mobile/ | 1 moderate ReDoS in an Expo-tooling-only devDependency (`@expo/fingerprint`→`minimatch`), not shipped in the app bundle |
| `npm audit` — admin/ | 0 vulnerabilities |

## Production release readiness

**Not a blanket "ready" or "not ready" — read the breakdown:**

- The Critical/High findings identified in this audit (anonymous-content deanonymization, plaintext mobile token storage, missing security headers) are **fixed and verified** by passing tests and clean typecheck/lint.
- The Medium findings (blocked-user bypass, translation-endpoint throttling, quota race condition) are **fixed and verified**.
- Several items are **genuinely out of this repo's reach** (Supabase/Render dashboard configuration) and must be confirmed by whoever operates those dashboards before this can be called production-ready in full — see *Manual actions required*.
- Account deletion is a **real compliance gap**, not something this audit silently built without your sign-off (it would need a new credential). Treat it as a required pre-launch item if this app is subject to app-store or GDPR-style deletion requirements.
- This audit is **broad but not exhaustive**: it's static code review plus targeted unit/e2e tests, not a formal penetration test or dynamic/fuzz-testing pass against a running instance. No destructive or production testing was performed, per your instructions. A follow-up authenticated dynamic scan against a staging environment is recommended before a high-stakes launch.
