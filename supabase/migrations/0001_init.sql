-- Parkit initial schema: spots, availability windows, bookings.
-- Money is stored in agorot (1 ILS = 100 agorot).

create extension if not exists btree_gist;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  neighborhood text not null,
  -- Approximate public location; the exact address lives in spot_secrets.
  lat double precision not null,
  lng double precision not null,
  spot_type text not null check (spot_type in ('covered', 'open', 'underground')),
  access text not null check (access in ('app', 'code', 'open')),
  has_ev boolean not null default false,
  price_hour_agorot integer not null check (price_hour_agorot between 100 and 10000),
  price_day_agorot integer not null check (price_day_agorot between 1000 and 50000),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Revealed only to the owner and to drivers holding a current booking.
create table public.spot_secrets (
  spot_id uuid primary key references public.spots on delete cascade,
  address text not null,
  access_instructions text
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots on delete cascade,
  period tstzrange not null check (not isempty(period)),
  exclude using gist (spot_id with =, period with &&)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots on delete restrict,
  driver_id uuid not null references auth.users on delete cascade,
  period tstzrange not null check (not isempty(period)),
  plate text not null,
  price_agorot integer not null,
  fee_agorot integer not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  exclude using gist (spot_id with =, period with &&) where (status = 'confirmed')
);

create index on public.bookings (driver_id);
create index on public.availability using gist (period);

-- Keep in sync with src/lib/pricing.ts
create or replace function public.quote_agorot(hour_agorot int, day_agorot int, minutes int)
returns int language sql immutable as $$
  select (minutes / 1440) * day_agorot
       + least(ceil((minutes % 1440) / 60.0)::int * hour_agorot, day_agorot)
$$;

create or replace function public.book_spot(p_spot uuid, p_start timestamptz, p_end timestamptz, p_plate text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  s public.spots;
  mins int;
  price int;
  b public.bookings;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_end <= p_start or p_start < now() - interval '15 minutes' then raise exception 'invalid_period'; end if;
  select * into s from public.spots where id = p_spot and active;
  if not found then raise exception 'spot_not_found'; end if;
  if s.owner_id = auth.uid() then raise exception 'own_spot'; end if;
  if not exists (
    select 1 from public.availability a
    where a.spot_id = p_spot and a.period @> tstzrange(p_start, p_end, '[)')
  ) then raise exception 'not_available'; end if;

  mins := ceil(extract(epoch from (p_end - p_start)) / 60)::int;
  price := public.quote_agorot(s.price_hour_agorot, s.price_day_agorot, mins);

  insert into public.bookings (spot_id, driver_id, period, plate, price_agorot, fee_agorot)
  values (p_spot, auth.uid(), tstzrange(p_start, p_end, '[)'), p_plate, price, round(price * 0.15))
  returning * into b;
  return b;
exception when exclusion_violation then
  raise exception 'already_booked';
end $$;

alter table public.profiles enable row level security;
alter table public.spots enable row level security;
alter table public.spot_secrets enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "spots readable" on public.spots for select using (active or owner_id = auth.uid());
create policy "owner inserts spots" on public.spots for insert with check (owner_id = auth.uid());
create policy "owner updates spots" on public.spots for update using (owner_id = auth.uid());

create policy "secret for owner or booker" on public.spot_secrets for select using (
  exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
  or exists (
    select 1 from public.bookings b
    where b.spot_id = spot_secrets.spot_id and b.driver_id = auth.uid()
      and b.status = 'confirmed' and upper(b.period) > now() - interval '1 hour'
  )
);
create policy "owner writes secret" on public.spot_secrets for all using (
  exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
) with check (
  exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
);

create policy "availability readable" on public.availability for select using (true);
create policy "owner writes availability" on public.availability for all using (
  exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
) with check (
  exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
);

-- Inserts go through book_spot(); drivers and owners can read, drivers can cancel.
create policy "booking visible to driver and owner" on public.bookings for select using (
  driver_id = auth.uid()
  or exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
);
create policy "driver cancels" on public.bookings for update using (driver_id = auth.uid())
  with check (driver_id = auth.uid() and status = 'cancelled');
revoke update on public.bookings from anon, authenticated;
grant update (status) on public.bookings to authenticated;

-- Busy periods are public (no driver identity) so the map can show what is free.
create or replace view public.busy_periods with (security_invoker = false) as
  select spot_id, period from public.bookings where status = 'confirmed';
grant select on public.busy_periods to anon, authenticated;

grant execute on function public.book_spot to authenticated;
