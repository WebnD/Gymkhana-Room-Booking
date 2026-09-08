# Gymkhana Room Booking System — PRD & Implementation Plan

**Status:** Final v1.0 — ready for Phase 0
**Author:** Drafted with Claude, based on requirements gathering conversation

---

## 1. Problem Statement

Room booking for the Gymkhana currently happens over WhatsApp messages — no visibility into what's already booked, no record of who booked what. This causes double-bookings and lost context on who booked a slot and for what society.

## 2. Scope for This Build

**In scope now: Meeting Room only.** STC Room and its GSAT Tech approval workflow are deferred (Section 10) — the data model leaves room for it, nothing about it gets built yet.

## 3. Final Requirements Summary

| Item | Decision |
|---|---|
| Login | Google OAuth, restricted to `@iitbbs.ac.in` |
| Roles | 2 only: hardcoded allow-list (can book), everyone else (view-only) |
| Booking fields | Society name (free text), start time, end time |
| Slot granularity | 30-minute increments |
| Operating hours | **9:00 AM – 3:00 AM** (next day) — see note below |
| Conflict rule | Hard block — no override, no waitlist |
| Calendar view | Rolling 7-day window from today, moving forward daily; no past bookings shown |
| Cancellation | Allowed; **only the original booker** can cancel their own booking; slot frees immediately |
| STC Room | Deferred |
| Recurring bookings | Out of scope |
| Tech stack | Next.js (App Router) + Supabase (Postgres + Auth) |

**Note on operating hours:** "till 3 pm" almost certainly means **3 AM** — 3 PM contradicts "late night," which you said twice. Building against **9:00 AM to 3:00 AM the next day** (an ~18-hour window). If that's wrong, it's a one-line change before Phase 0 starts, not a rebuild.

## 4. Users & Roles

| Role | Can do |
|---|---|
| **Can Book** — email on hardcoded allow-list | View calendar, book, cancel their own bookings |
| **Cannot Book** — any other `@iitbbs.ac.in` account | View calendar only |

The allow-list check and the `@iitbbs.ac.in` domain restriction are enforced in Postgres Row Level Security (RLS) — not just hidden in the UI. A hidden button doesn't stop someone from calling the API directly.

## 5. Core User Flow

1. Land on the site → **"Sign in with Google"** (`@iitbbs.ac.in` only).
2. Week-view calendar, today through +6 days, rolling forward daily. Each booked slot shows time + society.
3. If allow-listed → **"Book Room"** button visible.
4. Form: society name, start time, end time (30-min increments) → submit.
5. Overlap with an existing booking → reject: "this slot is already booked." No override.
6. Booker can **cancel** their own upcoming bookings; slot returns to free immediately. Nobody else can cancel someone else's booking.

## 6. Data Model

```sql
create table bookings (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'meeting',   -- kept generic so 'stc' can be added later
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  society text not null,
  booked_by_email text not null,
  status text not null default 'booked',  -- 'booked' | 'cancelled'
  created_at timestamptz not null default now()
);
```

**Late-night convention:** a booking that starts before midnight and ends after it (e.g. 11 PM–1 AM) is stored as one row spanning both calendar dates — `starts_at`/`ends_at` are real timestamps, not just a "date + time" pair, so this isn't actually a special case at the data layer. The calendar UI just needs to render it under the evening it started on.

**Robustness note:** to fully rule out two people booking the same overlapping slot in a race (both click submit at nearly the same time), the most reliable fix is a database-level exclusion constraint, not just an application-side check before insert:

```sql
create extension if not exists btree_gist;

alter table bookings
add constraint no_overlapping_bookings
exclude using gist (
  room with =,
  tstzrange(starts_at, ends_at) with &&
) where (status = 'booked');
```

This makes the database itself reject an overlapping insert, race-proof, regardless of what the frontend does. Worth doing even for a low-traffic internal tool — it's a few lines of SQL, not real engineering overhead.

## 7. Access Control (RLS Policies)

```sql
alter table bookings enable row level security;

-- Anyone with an @iitbbs.ac.in account can read
create policy "read for iitbbs domain"
on bookings for select
using (auth.jwt() ->> 'email' like '%@iitbbs.ac.in');

-- Only allow-listed emails can insert
create policy "insert for allow-listed bookers"
on bookings for insert
with check (
  auth.jwt() ->> 'email' in (
    'secretary1@iitbbs.ac.in',
    'secretary2@iitbbs.ac.in'
    -- full list goes here when you hand it over
  )
);

-- Only the original booker can cancel (update) their own row
create policy "cancel own booking only"
on bookings for update
using (auth.jwt() ->> 'email' = booked_by_email)
with check (auth.jwt() ->> 'email' = booked_by_email);
```

The allow-list literally lives in this policy — when you're ready, send the real list of emails and it's a one-line SQL update.

## 8. Tech Stack

- **Frontend + backend:** Next.js (App Router).
- **Database + Auth:** Supabase, using the current `@supabase/ssr` package (not the deprecated `auth-helpers-nextjs`).
- **Login:** Google OAuth via Supabase Auth's Google provider.
- **Hosting:** Vercel (pairs natively with Next.js); Supabase is already hosted.

## 9. Out of Scope / Non-Goals (v1)

- STC Room (Section 10).
- Recurring bookings.
- Approval workflows for Meeting Room.
- Email/SMS notifications.
- Admin UI for the allow-list — hardcoded via SQL for now.
- Viewing beyond the current 7-day window or past bookings.

## 10. Deferred: STC Room

- Comes under GSAT Tech; booking is request → approval → confirmed, not direct.
- `room` column takes `'stc'`; `status` gets `pending` / `rejected` added.
- GSAT Tech gets its own allow-list, same RLS mechanism as Section 7.

## 11. Step-by-Step Implementation Guide

### Phase 0 — Foundations

1. `npx create-next-app@latest gymkhana-room-booking --typescript --tailwind --app`
2. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
3. `npm install @supabase/supabase-js @supabase/ssr`
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your project url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   ```
5. In Google Cloud Console: create an OAuth 2.0 Client ID (Web application). Authorized JavaScript origin = your app's URL; Authorized redirect URI = the callback URL Supabase gives you (`https://<project>.supabase.co/auth/v1/callback`).
6. In Supabase dashboard → Authentication → Providers: enable Google, paste the Client ID + Secret from step 5.
7. In Supabase dashboard → Authentication → URL Configuration: add your app's dev and production URLs to the allowed redirect list.
8. Run the SQL from Section 6 (table + exclusion constraint) and Section 7 (RLS policies) in the Supabase SQL editor.
9. Sanity check: manually insert a test row as an allow-listed email, confirm a second overlapping insert gets rejected by the exclusion constraint.

### Phase 1 — MVP: View + Book Meeting Room

1. Create Supabase client helpers per `@supabase/ssr` docs — one for Server Components, one for Client Components, plus a middleware client for session refresh.
2. Add middleware that checks for a session and email domain; unauthenticated users get sent to a login page.
3. Build the login page: "Sign in with Google" button calling `supabase.auth.signInWithOAuth({ provider: 'google' })`, plus a callback route that exchanges the code for a session.
4. Build the week-view calendar: query `bookings` where `starts_at` falls in `[today, today+7days)` and `status = 'booked'`; render 7 day columns, each booking as a time + society block.
5. Determine "can this user book?" client-side by checking their session email against the same allow-list (for UI only — the real gate is the RLS insert policy from step 8 of Phase 0). Show/hide the "Book Room" button accordingly.
6. Build the booking form: society name (text input), start time + end time (time pickers snapped to 30-min steps), submit button.
7. On submit, insert into `bookings`; if the exclusion constraint rejects it, catch that error and show "this slot is already booked."
8. Deploy to Vercel; add the same env vars there; update the Supabase redirect URL list with the production domain.

### Phase 2 — Cancel + Hardening

1. On each booking block, if `booked_by_email` matches the current session's email, show a "Cancel" button.
2. Cancel action: `update bookings set status = 'cancelled' where id = ...` — the RLS policy from Section 7 already ensures only the original booker's session can do this successfully.
3. Re-query/re-render the calendar after cancel so the slot shows free immediately.
4. Mobile pass: check the week view and the booking form on a small screen.
5. QA pass before calling this done: try booking as a non-allow-listed account (should fail), try logging in with a non-`iitbbs.ac.in` account (should fail), try double-submitting the same slot quickly (should get rejected on the second one).

### Phase 3 — Future (only when you're ready)

- STC Room + GSAT Tech approval workflow (Section 10).
- Admin UI for managing the allow-list instead of raw SQL.
- Notifications, usage stats.

---

This is complete and buildable as-is. Send the real allow-list of emails whenever it's ready — everything else is locked.
