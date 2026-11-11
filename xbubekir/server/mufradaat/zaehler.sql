-- Tageszähler für mufradaat.AI (Projekt „xbubekir AI“), angelegt als Migration „mufradaat_ai_usage“.
-- user_id ist die ID des Kontos im Supabase-Projekt von Mufradaat (deshalb kein Fremdschlüssel auf auth.users).
-- Nur die Edge Function „mufradaat“ (service_role) liest und schreibt; RLS ist an, ohne Policies.
create table if not exists public.mufradaat_ai_usage (
  user_id uuid not null,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.mufradaat_ai_usage enable row level security;
create index if not exists mufradaat_ai_usage_day on public.mufradaat_ai_usage (day);

-- Eine Nachricht zählen. Rückgabe: neue Zahl des Kontos für heute, -1 = Limit des Kontos erreicht, -2 = Limit für alle erreicht.
-- „Heute“ nach Wiener Zeit. Das Sperren der Tabelle hält zwei gleichzeitige Anfragen auseinander.
create or replace function public.mufradaat_ai_take(p_user uuid, p_user_limit integer, p_all_limit integer)
returns integer language plpgsql set search_path = '' as $$
declare d date := (now() at time zone 'Europe/Vienna')::date; c integer;
begin
  lock table public.mufradaat_ai_usage in share row exclusive mode;
  if (select coalesce(sum(u.n), 0) from public.mufradaat_ai_usage u where u.day = d) >= p_all_limit then return -2; end if;
  insert into public.mufradaat_ai_usage as u (user_id, day, n) values (p_user, d, 1)
    on conflict (user_id, day) do update set n = u.n + 1 where u.n < p_user_limit
    returning u.n into c;
  return coalesce(c, -1);
end $$;

-- Eine Nachricht zurückgeben (OpenRouter hat nicht geantwortet).
create or replace function public.mufradaat_ai_give_back(p_user uuid)
returns void language sql set search_path = '' as $$
  update public.mufradaat_ai_usage set n = n - 1
  where user_id = p_user and day = (now() at time zone 'Europe/Vienna')::date and n > 0;
$$;

revoke all on table public.mufradaat_ai_usage from anon, authenticated;
revoke execute on function public.mufradaat_ai_take(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.mufradaat_ai_give_back(uuid) from public, anon, authenticated;
grant execute on function public.mufradaat_ai_take(uuid, integer, integer) to service_role;
grant execute on function public.mufradaat_ai_give_back(uuid) to service_role;

-- Übersetzung und Umschrift auf Abruf (Migration „mufradaat_ai_help“): eigener Zähler in Spalte h, damit sie das Gespräch nicht aufbrauchen.
alter table public.mufradaat_ai_usage add column if not exists h integer not null default 0;

-- Eine Übersetzung oder Umschrift zählen. Rückgabe wie bei mufradaat_ai_take: neue Zahl, -1 = Limit des Kontos, -2 = Limit für alle.
create or replace function public.mufradaat_ai_take_help(p_user uuid, p_user_limit integer, p_all_limit integer)
returns integer language plpgsql set search_path = '' as $$
declare d date := (now() at time zone 'Europe/Vienna')::date; c integer;
begin
  lock table public.mufradaat_ai_usage in share row exclusive mode;
  if (select coalesce(sum(u.h), 0) from public.mufradaat_ai_usage u where u.day = d) >= p_all_limit then return -2; end if;
  insert into public.mufradaat_ai_usage as u (user_id, day, n, h) values (p_user, d, 0, 1)
    on conflict (user_id, day) do update set h = u.h + 1 where u.h < p_user_limit
    returning u.h into c;
  return coalesce(c, -1);
end $$;

create or replace function public.mufradaat_ai_give_back_help(p_user uuid)
returns void language sql set search_path = '' as $$
  update public.mufradaat_ai_usage set h = h - 1
  where user_id = p_user and day = (now() at time zone 'Europe/Vienna')::date and h > 0;
$$;

revoke execute on function public.mufradaat_ai_take_help(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.mufradaat_ai_give_back_help(uuid) from public, anon, authenticated;
grant execute on function public.mufradaat_ai_take_help(uuid, integer, integer) to service_role;
grant execute on function public.mufradaat_ai_give_back_help(uuid) to service_role;
