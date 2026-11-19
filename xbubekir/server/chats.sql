-- Chats geräteübergreifend (Projekt „xbubekir“), angelegt als Migration „chats_sync“.
-- Die App schreibt und liest direkt (supabase-js), RLS lässt jedes Konto nur an seine eigenen Chats, und nur Konten aus allowed_users.
-- updated: Änderungszeit des Chats auf dem Gerät (ms), entscheidet bei Konflikten. synced_at: Serverzeit, ab der ein Gerät neu abholt.
-- Gelöschte Chats bleiben als Zeile ohne Inhalt (deleted = true), damit die anderen Geräte vom Löschen erfahren.
create table if not exists public.chats (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  updated bigint not null,
  deleted boolean not null default false,
  data jsonb,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.chats enable row level security;
create index if not exists chats_user_synced on public.chats (user_id, synced_at);

-- allowed_users ist für Konten nicht lesbar, deshalb die Prüfung als security definer (Schema „private“ ist nicht über die API erreichbar).
create schema if not exists private;
create or replace function private.xb_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.allowed_users where user_id = (select auth.uid()));
$$;
revoke all on function private.xb_allowed() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.xb_allowed() to authenticated;

drop policy if exists "eigene Chats" on public.chats;
create policy "eigene Chats" on public.chats for all to authenticated
  using (user_id = (select auth.uid()) and (select private.xb_allowed()))
  with check (user_id = (select auth.uid()) and (select private.xb_allowed()));

-- Serverzeit setzen; eine ältere Fassung überschreibt nie eine neuere (die Zeile bleibt dann unverändert).
create or replace function private.chats_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated < old.updated then return null; end if;
  new.synced_at := now();
  return new;
end $$;
drop trigger if exists chats_stamp on public.chats;
create trigger chats_stamp before insert or update on public.chats for each row execute function private.chats_stamp();

revoke all on table public.chats from anon;
grant select, insert, update on table public.chats to authenticated;
