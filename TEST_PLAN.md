# Drift — Test Plan

High-level strategy; expanded with concrete test files as each phase is implemented.

## Unit tests
- Thought validation (length, mood, privacy setting).
- Permission checks (who can see/edit/delete what).
- Reaction logic (one reaction per user per type, counts stay private to author).
- Connection request state machine (pending → accepted/declined/withdrawn; one-shot intro
  message enforcement; no messaging before acceptance).
- Messaging authorization (sender/recipient must share an active connection).
- Discovery filtering (privacy settings, blocks honored, no exact location leakage).
- Destiny assignment (once per day per user, no immediate repeats).

## Integration tests
- Auth flows (signup/login via Supabase, session validation in custom API).
- Thought create → discover → react → reply, against a real test database.
- Connection request → accept → message, end-to-end against the API.
- Block/report → moderation queue entry created correctly.
- Admin RBAC: an under-privileged admin role is rejected from privileged actions.

## End-to-end tests (mobile)
- Registration → onboarding → enter universe.
- Create a thought → see it appear → react/reply from a second test account.
- Send connection request with intro message → accept → exchange messages.
- Block a user → confirm no further visibility/contact in either direction.
- Report a thought → confirm it surfaces in the admin moderation queue.
- Account deletion removes/anonymizes data per retention rules.

## Mobile-specific checks
- iOS and Android, including an older/low-end device class.
- Small screen sizes and large dynamic font sizes.
- Slow/flaky network and full offline state.
- App backgrounding/foregrounding during an open bubble, during a call to send a message.
- Push notification delivery for each enabled category.
- Bubble animation frame rate under a realistic bubble count; reduced-motion setting respected.

## Status
- Phase 2 backend (`/api`): 16 unit tests + 5 e2e tests passing (auth, validation, ownership,
  reactions, discovery filtering, rate limiting) — see `api/README.md` to run them.
- Phase 1 mobile (`/mobile`): typecheck + lint passing, no automated component/animation tests
  yet (manually verified on-device). Will be added as Create/Profile screens are built in Phase 2.
- Not yet covered: integration tests against a real Supabase project (none created yet), mobile
  E2E tests, admin portal tests (not built).
