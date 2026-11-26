# Deploying the API and admin portal for free

This covers the NestJS API (`/api`) on Render and the Next.js admin portal
(`/admin`) on Vercel. Both have a free tier that's enough for this project.
The mobile app isn't covered here — see the note at the bottom.

## 1. API -> Render

Render reads `render.yaml` at the repo root (a "Blueprint") and provisions
the service for you.

1. Go to the [Render Dashboard](https://dashboard.render.com), sign in
   (GitHub sign-in is easiest since this repo is on GitHub).
2. **New +** -> **Blueprint**.
3. Connect/select this GitHub repo (`puddu045/Drift`) and branch
   `claude/gracious-goodall-uxu978` (or whichever branch you want live).
4. Render shows the one service from `render.yaml` (`drift-api`). Click
   **Apply** — it'll prompt you for these values (marked `sync: false` in
   the file, so Render never stores them in the repo):

   | Variable | Where to get it |
   |---|---|
   | `DATABASE_URL` | Supabase dashboard -> Project Settings -> Database -> Connection string -> **URI** (use the real password, not the placeholder) |
   | `SUPABASE_URL` | Supabase dashboard -> Project Settings -> API -> Project URL |
   | `SUPABASE_JWKS_URL` | Same project's URL with `/auth/v1/.well-known/jwks.json` appended (matches `SUPABASE_JWKS_URL` in `api/.env.example`) |
   | `CORS_ORIGINS` | Leave blank for now — come back and fill this in after step 2, with your Vercel URL |

5. Click **Deploy**. First deploy takes a few minutes (installs deps,
   generates the Prisma client, runs `prisma migrate deploy`, builds, starts).
6. Once it's live, Render shows the service URL — something like
   `https://drift-api.onrender.com`. That's your API's base URL.

**Free-tier caveat:** the service spins down after ~15 minutes idle. The
next request after that takes a few extra seconds to wake it back up —
normal for Render's free tier, not a bug.

## 2. Admin portal -> Vercel

1. Go to [vercel.com](https://vercel.com), sign in with GitHub.
2. **Add New...** -> **Project**, import this same repo.
3. Before deploying, click **Edit** next to **Root Directory** and set it
   to `admin` (this is a monorepo — Vercel needs to know the admin portal
   lives in that subfolder, not the repo root).
4. Vercel auto-detects Next.js — no other build settings needed.
5. Add these environment variables (from `admin/.env.example`):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL as above |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard -> Project Settings -> API -> Publishable key |
   | `NEXT_PUBLIC_API_URL` | The Render URL from step 1 (e.g. `https://drift-api.onrender.com`) |

6. Click **Deploy**. Vercel gives you a URL like
   `https://drift-admin.vercel.app` (exact name depends on what you call
   the project on import).

## 3. Wire the two together

Back on Render: open `drift-api` -> **Environment**, set `CORS_ORIGINS` to
your Vercel URL from step 2 (e.g. `https://drift-admin.vercel.app`, no
trailing slash), save — Render redeploys automatically. Without this, the
admin portal's browser requests to the API get blocked by CORS.

Then open your Vercel URL, sign in with an account that has `role: admin`
in Supabase, and confirm the dashboard loads data from the live API.

## About the mobile app

The mobile app isn't part of this deploy — "free hosting" doesn't really
apply to it the same way (see the earlier chat answer: Expo Go / EAS's free
build tier for testing and sharing, actual app-store listing costs the
usual developer fees). Nothing here changes how you run the mobile app
against your local API for day-to-day development; `EXPO_PUBLIC_API_URL`
only needs to point at the Render URL if you specifically want the phone
talking to the deployed API instead of your machine.
