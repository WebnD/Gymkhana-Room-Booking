-- ==============================================================================
-- Gymkhana Room Booking System — Pattern-Based RLS Policy Migration
-- Allows any secretary/gsec/coord/vpresident (@iitbbs.ac.in) to book without hardcoding every single email.
-- Student Activity Centre (SAC), IIT Bhubaneswar
-- ==============================================================================

-- Drop old insert policy
drop policy if exists "insert for allow-listed bookers" on public.bookings;

-- Create dynamic pattern-based insert policy
create policy "insert for allow-listed bookers"
on public.bookings
for insert
to authenticated
with check (
  (
    -- 1. Must be an official @iitbbs.ac.in email
    lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) ilike '%@iitbbs.ac.in'
    and
    (
      -- 2. Matches leadership role patterns (secy*, gsec*, coord*, vpresident*, president*, convenor*, or contains .sg@ / .photosoc@ / .soc@)
      lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) ~* '^(secy|gsec|coord|vpresident|president|convenor)[a-z0-9._-]*@iitbbs\.ac\.in$'
      or lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) ilike '%.sg@iitbbs.ac.in'
      or lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) ilike '%.photosoc@iitbbs.ac.in'
      or lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) ilike '%.soc@iitbbs.ac.in'
      -- 3. Fallback explicit list
      or lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) in (
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
  )
  and (
    lower(booked_by_email) = lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', ''))
  )
);
