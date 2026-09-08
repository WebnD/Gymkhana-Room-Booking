-- ==============================================================================
-- Migration: Update Allow-List for Room Bookings
-- Student Activity Centre (SAC) Gymkhana, IIT Bhubaneswar
-- ==============================================================================

-- 1. Drop existing insert policy
drop policy if exists "insert for allow-listed bookers" on public.bookings;

-- 2. Create updated policy with current authorized secretaries & coordinators
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
