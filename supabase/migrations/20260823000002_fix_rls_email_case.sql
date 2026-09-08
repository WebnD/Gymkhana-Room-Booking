-- ==============================================================================
-- Gymkhana Room Booking System — RLS Policy Update with Case-Insensitive Matching
-- Student Activity Centre (SAC), IIT Bhubaneswar
-- ==============================================================================

-- Drop old policies to replace with robust case-insensitive versions
drop policy if exists "read for iitbbs domain" on public.bookings;
drop policy if exists "insert for allow-listed bookers" on public.bookings;
drop policy if exists "cancel own booking only" on public.bookings;

-- 1. Read Policy: Viewable by anyone with an @iitbbs.ac.in email
create policy "read for iitbbs domain"
on public.bookings
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) ilike '%@iitbbs.ac.in'
);

-- 2. Insert Policy: Allowed only for the 19 authorized Gymkhana emails (case-insensitive)
create policy "insert for allow-listed bookers"
on public.bookings
for insert
to authenticated
with check (
  (
    lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) in (
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
    lower(booked_by_email) = lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', ''))
  )
);

-- 3. Cancel (Update) Policy: User can only cancel their own bookings
create policy "cancel own booking only"
on public.bookings
for update
to authenticated
using (
  lower(booked_by_email) = lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', ''))
)
with check (
  lower(booked_by_email) = lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', ''))
  and status = 'cancelled'
);
