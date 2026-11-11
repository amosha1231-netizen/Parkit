-- Parkit 0002: host tools and server-side safety checks.
-- Run after 0001_init.sql (Supabase dashboard > SQL editor, or `supabase db push`).

-- The weekly pattern a host picked, so availability can be extended with one click.
alter table public.spots add column if not exists schedule text
  check (schedule in ('weekdays', 'nights', 'always', 'weekend'));

-- Length limits on free text, so one listing cannot store megabytes.
alter table public.spots add constraint spots_description_len check (char_length(description) <= 500);
alter table public.spot_secrets add constraint secrets_address_len check (char_length(address) <= 200);
alter table public.spot_secrets add constraint secrets_instructions_len check (char_length(access_instructions) <= 500);
alter table public.bookings add constraint bookings_plate_format check (plate ~ '^[0-9]{2,3}-[0-9]{2,3}-[0-9]{2,3}$') not valid; -- existing rows are left as they are

-- Creating a spot used to be three separate inserts from the app; if the second or third failed,
-- a spot went live on the map with no address. This does all three in one transaction.
create or replace function public.create_spot(
  p_neighborhood text, p_lat double precision, p_lng double precision,
  p_spot_type text, p_access text, p_has_ev boolean,
  p_price_hour int, p_price_day int, p_description text, p_schedule text,
  p_address text, p_access_instructions text, p_windows text[]
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.spots (neighborhood, lat, lng, spot_type, access, has_ev, price_hour_agorot, price_day_agorot, description, schedule)
  values (p_neighborhood, p_lat, p_lng, p_spot_type, p_access, p_has_ev, p_price_hour, p_price_day, p_description, p_schedule)
  returning id into new_id;
  insert into public.spot_secrets (spot_id, address, access_instructions)
  values (new_id, p_address, p_access_instructions);
  insert into public.availability (spot_id, period)
  select new_id, w::tstzrange from unnest(p_windows) as w;
  return new_id;
end $$;
grant execute on function public.create_spot to authenticated;

-- Cancelling used to be a plain UPDATE that the app checked; the database allowed a driver to cancel
-- at any time, even after parking. Now only this function can cancel, and only up to an hour before start.
-- Keep the cutoff in sync with CANCEL_CUTOFF_MS in src/lib/repo/types.ts.
create or replace function public.cancel_booking(p_booking uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into b from public.bookings
    where id = p_booking and driver_id = auth.uid() and status = 'confirmed'
    for update;
  if not found then raise exception 'booking_not_found'; end if;
  if lower(b.period) - now() < interval '1 hour' then raise exception 'too_late_to_cancel'; end if;
  update public.bookings set status = 'cancelled' where id = p_booking;
end $$;
grant execute on function public.cancel_booking to authenticated;

drop policy if exists "driver cancels" on public.bookings;
revoke update on public.bookings from authenticated;

create index if not exists availability_spot_idx on public.availability (spot_id);
create index if not exists bookings_spot_idx on public.bookings (spot_id);
