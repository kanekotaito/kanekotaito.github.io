-- 猟銃試験「みんなの筋肉道場」オンライン対戦用
-- Supabase SQL Editor で実行し、Authentication > Providers で Anonymous Sign-Ins を有効化。
-- 公開するのは対戦用の名前・4種の成績・筋肉レベルだけ。
-- 問題文・学習履歴・選んだ回答・メールはサーバーへ送信しない。
create table if not exists public.ryoju_public_players (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 local_player_id text not null check (char_length(local_player_id) between 1 and 100),
 display_name text not null check (char_length(display_name) between 1 and 16),
 mastered integer not null default 0 check (mastered between 0 and 600),
 packs integer not null default 0 check (packs between 0 and 8),
 best integer not null default 0 check (best between 0 and 50),
 recovered integer not null default 0 check (recovered between 0 and 600),
 muscle_stage integer not null default 0 check (muscle_stage between 0 and 14),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint ryoju_public_players_owner_local_unique unique(owner_id,local_player_id)
);
create index if not exists ryoju_public_players_updated_idx on public.ryoju_public_players(updated_at desc);
alter table public.ryoju_public_players enable row level security;
-- All visitors, even ones without a Supabase login, can read public duel statistics.
-- Browser anonymous sign-in creates an authenticated identity for writes/deletion.
drop policy if exists ryoju_read on public.ryoju_public_players;
create policy ryoju_read on public.ryoju_public_players for select to anon, authenticated using (true);
drop policy if exists ryoju_insert_own on public.ryoju_public_players;
create policy ryoju_insert_own on public.ryoju_public_players for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists ryoju_update_own on public.ryoju_public_players;
create policy ryoju_update_own on public.ryoju_public_players for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists ryoju_delete_own on public.ryoju_public_players;
create policy ryoju_delete_own on public.ryoju_public_players for delete to authenticated using (owner_id = (select auth.uid()));
-- Restrict direct table access to published/statistical columns for untrusted browsers.
revoke all on public.ryoju_public_players from public;
-- Whitelist public columns: internal auth user ID and local device IDs stay hidden.
grant select (id,display_name,mastered,packs,best,recovered,muscle_stage,updated_at) on public.ryoju_public_players to anon, authenticated;
grant insert, update, delete on public.ryoju_public_players to authenticated;
-- Ownership checks occur on the server via RLS; publishable key is safe to expose.
-- Anonymous auth sessions are tied to one browser. Switching device will not confer ownership.
