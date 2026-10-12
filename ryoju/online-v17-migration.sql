-- v17 migration for installations that previously ran online-schema.sql.
-- No player rows, ownership identities, or progress records are deleted.
-- Run once in Supabase SQL Editor before enabling v17 online publication.
begin;
alter table public.ryoju_public_players
 drop constraint if exists ryoju_public_players_mastered_check,
 drop constraint if exists ryoju_public_players_packs_check,
 drop constraint if exists ryoju_public_players_recovered_check,
 drop constraint if exists ryoju_public_players_muscle_stage_check;

alter table public.ryoju_public_players
 alter column mastered type bigint,
 alter column packs type bigint,
 alter column recovered type bigint,
 alter column muscle_stage type bigint;

alter table public.ryoju_public_players
 add column if not exists practice_correct bigint not null default 0;

do $$
begin
 if not exists (
  select 1 from pg_constraint
  where conrelid='public.ryoju_public_players'::regclass
    and conname='ryoju_public_players_progress_v17_check'
 ) then
   alter table public.ryoju_public_players
     add constraint ryoju_public_players_progress_v17_check
     check (mastered>=0 and packs>=0 and recovered>=0
            and muscle_stage>=0 and practice_correct>=0);
 end if;
end $$;

-- Maintain the original column-level read whitelist and owner-only RLS rules.
grant select (practice_correct) on public.ryoju_public_players to anon,authenticated;
commit;
