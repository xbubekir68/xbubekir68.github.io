-- Gedächtnis von xbubekir (Projekt „xbubekir“), angelegt als Migration „memories“.
-- Eine Zeile ist eine Erinnerung: ein kurzer Satz über die Person. Die App liest, schreibt und löscht direkt (supabase-js);
-- RLS lässt jedes Konto nur an sein eigenes Gedächtnis, und nur Konten aus allowed_users (private.xb_allowed aus chats.sql).
-- Löschen ist echtes Löschen (DELETE), keine Markierung. Selbsttest: server/memory-test.sql
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('person', 'vorliebe', 'info', 'projekt')), -- person/vorliebe: immer dabei, info/projekt: nach Relevanz
  project text check (char_length(project) between 1 and 80),
  text text not null check (char_length(text) between 1 and 300),
  source text not null default 'gesagt' check (source in ('gesagt', 'vermutet', 'manuell')), -- gesagt: bestätigt, vermutet: geschlossen
  chat_id text, -- Quelle: der Chat, aus dem die Erinnerung stammt
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'projekt') = (project is not null))
);
alter table public.memories enable row level security;
create index if not exists memories_user on public.memories (user_id, updated_at desc);

drop policy if exists "eigenes Gedächtnis" on public.memories;
create policy "eigenes Gedächtnis" on public.memories for all to authenticated
  using (user_id = (select auth.uid()) and (select private.xb_allowed()))
  with check (user_id = (select auth.uid()) and (select private.xb_allowed()));

revoke all on table public.memories from anon;
grant select, insert, update, delete on table public.memories to authenticated;
