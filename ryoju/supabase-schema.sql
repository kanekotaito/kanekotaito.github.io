-- Muscle Dojo: publish ONLY aggregated, non-sensitive competition metrics.
-- Private question/answer history remains in browser localStorage.
-- Apply via Supabase SQL Editor to a project with Anonymous Sign-ins enabled.
create table if not exists public.muscle_arena_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_player_id text not null check (char_length(local_player_id) between 1 and 100),
  display_name text not null check (char_length(trim(display_name)) between 1 and 32),
  mastered integer not null default 0 check (mastered between 0 and 600),
  packs integer not null default 0 check (packs between 0 and 8),
  best integer not null default 0 check (best between 0 and 50),
  recovered integer not null default 0 check (recovered between 0 and 600),
  stage integer not null default 0 check (stage between 0 and 14),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint muscle_profiles_owner_local_uniq unique (owner_id,local_player_id)
);

alter table public.muscle_arena_profiles enable row level security;

-- The directory is public; it contains no detailed answers or contact data.
grant select on public.muscle_arena_profiles to anon, authenticated;
grant insert,update,delete on public.muscle_arena_profiles to authenticated;

create policy "Anyone may view aggregate armwrestling stats"
 on public.muscle_arena_profiles for select to anon, authenticated
 using (true);

create policy "Only signed-in owner may create their fighter"
 on public.muscle_arena_profiles for insert to authenticated
 with check ((select auth.uid()) = owner_id);

create policy "Only signed-in owner may update their fighter"
 on public.muscle_arena_profiles for update to authenticated
 using ((select auth.uid()) = owner_id)
 with check ((select auth.uid()) = owner_id);

create policy "Only signed-in owner may delete their fighter"
 on public.muscle_arena_profiles for delete to authenticated
 using ((select auth.uid()) = owner_id);

create index if not exists muscle_arena_profiles_updated_idx
 on public.muscle_arena_profiles (updated_at desc);

-- Limiting players per anonymous user reduces trivial spam.
create or replace function public.limit_muscle_fighters()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
 if (select count(*) from public.muscle_arena_profiles where owner_id = new.owner_id) >= 16
 then raise exception '1端末につき公開プレイヤーは16人までです';
 end if;
 return new;
end $$;

create trigger limit_muscle_fighter_insert
before insert on public.muscle_arena_profiles
for each row execute function public.limit_muscle_fighters();

-- Only display_name, aggregated results, growth stage, and anonymous ownership IDs
-- are publicly visible. No address, answers, study notes, or contact information.
