-- Profiles + day-by-day step history, scoped one row per user with RLS.
--
-- Friends stay mocked (`friends.ts` in the mobile app) for now — this schema only
-- persists MY OWN profile and MY OWN step history, replacing the local-only MMKV
-- mock (`use-day-history.ts`) and the fake-token auth store. No cross-account
-- reads: the leaderboard/social layer is a later, separate chantier.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  -- Kept in sync with `apps/mobile/src/features/garden/palette.ts`'s `Hue` union —
  -- update both together if a hue is ever added or renamed.
  flower text not null default 'coral'
    check (flower in ('blue', 'coral', 'cream', 'lilac', 'pink', 'red', 'white', 'yellow')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id);

-- No client-facing insert/delete policy on purpose: rows are created only by the
-- `handle_new_user` trigger below (security definer), never by direct client insert.

-- ---------------------------------------------------------------------------
-- day_activity — one row per user per calendar day
-- ---------------------------------------------------------------------------

create table public.day_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  steps integer not null default 0 check (steps >= 0),
  goal integer not null default 10000 check (goal >= 0),
  -- 'seed' is the mobile app's current dev/demo source (see `use-day-history.ts`);
  -- 'apple-health' / 'health-connect' match `packages/domain`'s `StepSource` and
  -- are not wired to a real client yet.
  source text not null default 'seed'
    check (source in ('seed', 'manual', 'apple-health', 'health-connect')),
  synced_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.day_activity enable row level security;

create policy "day_activity: owner can read"
  on public.day_activity for select
  using (auth.uid() = user_id);

create policy "day_activity: owner can insert"
  on public.day_activity for insert
  with check (auth.uid() = user_id);

create policy "day_activity: owner can update"
  on public.day_activity for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row on signup, whatever the auth method
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1),
      'Marcheur'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
