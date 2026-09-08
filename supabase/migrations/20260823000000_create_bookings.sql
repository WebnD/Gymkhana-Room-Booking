-- ==============================================================================
-- Gymkhana Room Booking System — Database Schema & Security Migration
-- Student Activity Centre (SAC), IIT Bhubaneswar
-- ==============================================================================

-- 1. Enable btree_gist extension for exclusion constraint support
create extension if not exists btree_gist;

-- 2. Create the bookings table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'meeting',          -- 'meeting' (ready for 'stc' later)
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  society text not null,                         -- Society / Club name (e.g. 'Web & Coding Club')
  purpose text,                                  -- Meeting agenda / purpose
  booked_by_email text not null,                 -- Email of the student/secretary
  booked_by_name text,                           -- Display name of the booker
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at timestamptz not null default now(),

  constraint valid_booking_duration check (ends_at > starts_at)
);

-- 3. Exclusion constraint to strictly block overlapping bookings at database level
-- This eliminates race conditions when multiple users attempt to book the same slot simultaneously.
alter table public.bookings drop constraint if exists no_overlapping_bookings;

alter table public.bookings
add constraint no_overlapping_bookings
exclude using gist (
  room with =,
  tstzrange(starts_at, ends_at) with &&
) where (status = 'booked');

-- 4. Helpful indexes for fast querying of rolling 7-day ranges & user bookings
create index if not exists idx_bookings_room_time 
on public.bookings (room, starts_at, ends_at) 
where status = 'booked';

create index if not exists idx_bookings_user_email 
on public.bookings (booked_by_email, starts_at desc);

-- 5. Row Level Security (RLS) Configuration
alter table public.bookings enable row level security;

-- Drop existing policies if re-running migration
drop policy if exists "read for iitbbs domain" on public.bookings;
drop policy if exists "insert for allow-listed bookers" on public.bookings;
drop policy if exists "cancel own booking only" on public.bookings;

-- Policy 1: Read Access
-- Anyone logged in with an @iitbbs.ac.in account can view bookings
create policy "read for iitbbs domain"
on public.bookings
for select
to authenticated
using (
  coalesce(auth.jwt() ->> 'email', '') ilike '%@iitbbs.ac.in'
  or (auth.jwt() -> 'user_metadata' ->> 'email') ilike '%@iitbbs.ac.in'
);

-- Policy 2: Insert Access
-- Only authorized society secretaries / Gymkhana representatives can create bookings
create policy "insert for allow-listed bookers"
on public.bookings
for insert
to authenticated
with check (
  (
    coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '') in (
      'secyweb.sg@iitbbs.ac.in',
      'secyfebs.sg@iitbbs.ac.in',
      'secyrobotics.sg@iitbbs.ac.in',
      'secyprogsoc.sg@iitbbs.ac.in',
      'secyastronomy.sg@iitbbs.ac.in',
      'secymusic.sg@iitbbs.ac.in',
      'secysfs.sg@iitbbs.ac.in',
      'secydance.sg@iitbbs.ac.in',
      'secybadminton.sg@iitbbs.ac.in',
      'clix.photosoc@iitbbs.ac.in',
      'secydrams.sg@iitbbs.ac.in',
      'secyvolleyball.sg@iitbbs.ac.in',
      'secyboardgames.sg@iitbbs.ac.in',
      'gsecsnt.sg@iitbbs.ac.in',
      'gsecsports.sg@iitbbs.ac.in',
      'gseccul.sg@iitbbs.ac.in',
      'vpresident.sg@iitbbs.ac.in',
      'coord.pravaah@iitbbs.ac.in',
      'coord.ashvamedha@iitbbs.ac.in'
    )
  )
  and (
    booked_by_email = coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email')
  )
);

-- Policy 3: Cancellation (Update) Access
-- Only the original booker can cancel their own booking (set status to 'cancelled')
create policy "cancel own booking only"
on public.bookings
for update
to authenticated
using (
  coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email') = booked_by_email
)
with check (
  coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email') = booked_by_email
  and status = 'cancelled'
);
