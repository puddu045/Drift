# Drift — Product Requirements (MVP)

See `DECISIONS.md` for approved decisions this spec builds on.

## 1. Product summary

Drift is a global social discovery app where strangers connect through short anonymous
"thoughts" rather than photos or appearance. Users explore a calm, animated universe of
floating thought bubbles, react and reply publicly, and may request a private connection
that unlocks messaging only after mutual consent.

**Core emotional promise:** you might discover someone who understands you, even on the
other side of the world. Not a dating app, not a feed — a space for genuine connection.

## 2. MVP scope (what ships in v1)

### In scope
- Onboarding: welcome → explain universe/thoughts → account creation → age confirmation →
  interests/languages → privacy & connection preferences → enter universe.
- **Universe screen**: 2D floating bubble field of thoughts, tap to expand/read, pause while open.
- **Thought composer**: text (280 char limit), mood selector (manual), privacy setting, release.
- **Thought detail**: full text, mood, reactions (Heart/Relate/Beautiful/Thoughtful/Hug — counts
  private to author), single-level public replies, report, block/mute, connection request.
- **Connections**: send/accept/decline/withdraw request, one-shot intro message with a request,
  remove connection, block, report. No messaging before acceptance.
- **Private messaging**: 1:1 text chat after mutual acceptance, delivery state, conversation list,
  pagination, push notifications. No read receipts/typing indicators/media/voice/video in MVP.
- **Destiny mode**: once per day, one random stranger's thought surfaced specially; user can
  reply or let it drift away. No compatibility/matching claims.
- **Profile**: pseudonymous display name, optional photo (user-controlled reveal), bio, country,
  languages, interests, relationship-intent preference (soft signal only), privacy controls
  (who can see profile / send requests / discover me / show country / show activity).
- **Notifications**: reaction, reply, connection request, request accepted, new message, daily
  Destiny ready — each category independently toggleable.
- **Safety**: report (thought/reply/profile/message), block, mute, rate limiting, basic spam
  detection, account suspension/deletion, data retention rules.
- **Admin portal**: dashboard metrics, user search/suspend/ban, moderation queue for reports,
  moderation action log, basic app configuration (moods, feature flags, rate limits), RBAC +
  audit log for admin actions. No bulk access to private messages for ordinary admins.

### Explicitly out of scope for MVP (deferred)
- Soul Echo (semantic similarity matching).
- Thought Journey (reach/geo visualization).
- Payments/monetization features (architecture allows for them later; nothing user-facing now).
- Read receipts, typing indicators, voice notes, photo/video messages, video calls, disappearing
  or editable messages, message translation, end-to-end encryption.
- Public web app (beyond the admin portal).
- 3D/physics-based universe rendering.

## 3. Core user flows

1. **Discover → react → reply**: open Universe → tap bubble → read thought → react and/or
   reply publicly → close, bubble resumes drifting.
2. **Connect**: from a thought detail or reply thread, send a connection request (optionally
   with one intro message) → recipient accepts/declines → on accept, full messaging unlocks.
3. **Message**: from Connections tab, open an accepted connection's conversation → send/receive
   text messages in real time → can block/report/remove connection at any time.
4. **Post a thought**: Create tab → write thought → pick mood → set privacy → release → appears
   in own history and (if public) becomes discoverable to others.
5. **Daily Destiny**: open Destiny tab once/day → view the day's surprise thought → reply or
   let it drift → (future: author may see/respond if they enabled replies).
6. **Report/block/safety**: from any thought, reply, profile or message, report with a reason;
   block stops all future contact and discovery from that user in both directions.

## 4. Non-functional requirements
- Smooth bubble animation on typical modern Android/iOS devices; respects reduced-motion and
  low-power settings; limited number of concurrently rendered bubbles with cursor-based loading.
- No private messaging action is authorized client-side only — every connection/message action
  is checked server-side.
- No location more precise than country-level is ever exposed to other users.
- No fabricated user activity, matches, or testimonials — all displayed metrics come from real
  recorded data, clearly scoped to what the user has consented to share.
- Privacy-by-default on new accounts (no premature oversharing of profile fields).

## 5. Success criteria for MVP beta
- A new user can complete onboarding, post a thought, discover and react to others' thoughts,
  form a mutually-consented connection, and exchange messages — entirely without developer
  intervention, on both iOS and Android, including on a throttled network.
- Report/block flows work end-to-end and are visible in the admin moderation queue.
- No crash or unhandled error during the above path across a basic device/OS matrix.
