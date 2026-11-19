-- Selbsttest für public.memories: Nutzertrennung, nicht freigeschaltete Konten, echtes Löschen.
-- Läuft in einer Transaktion mit drei Testkonten und nimmt am Ende alles zurück. Im Supabase-SQL-Editor ausführen;
-- schlägt etwas fehl, bricht er mit „FEHLER: …“ ab, sonst kommt „Gedächtnis-Selbsttest bestanden“.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-4000-8000-00000000000c', 'c@test.invalid');
insert into public.allowed_users (user_id) values
  ('00000000-0000-4000-8000-00000000000a'), ('00000000-0000-4000-8000-00000000000b');

set local role authenticated;
-- A legt eine Erinnerung an und darf nicht für B schreiben
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
insert into public.memories (user_id, kind, text) values ('00000000-0000-4000-8000-00000000000a', 'person', 'Studiert Informatik.');
do $$ begin
  begin
    insert into public.memories (user_id, kind, text) values ('00000000-0000-4000-8000-00000000000b', 'person', 'untergeschoben');
    raise exception 'FEHLER: A konnte für B schreiben';
  exception when insufficient_privilege then null; end;
end $$;

-- B sieht nichts von A und kann A weder ändern noch löschen
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.memories) then raise exception 'FEHLER: B sieht das Gedächtnis von A'; end if;
  update public.memories set text = 'verändert';
  delete from public.memories;
end $$;

-- C ist nicht freigeschaltet: darf nicht schreiben
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
do $$ begin
  begin
    insert into public.memories (user_id, kind, text) values ('00000000-0000-4000-8000-00000000000c', 'person', 'x');
    raise exception 'FEHLER: nicht freigeschaltetes Konto konnte schreiben';
  exception when insufficient_privilege then null; end;
end $$;

-- A: Erinnerung unverändert, Projekt ohne Namen abgelehnt, Löschen entfernt die Zeile wirklich
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
do $$ begin
  if (select text from public.memories) is distinct from 'Studiert Informatik.' then raise exception 'FEHLER: B hat A verändert oder gelöscht'; end if;
  begin
    insert into public.memories (user_id, kind, text) values ('00000000-0000-4000-8000-00000000000a', 'projekt', 'ohne Projektnamen');
    raise exception 'FEHLER: Projekt-Erinnerung ohne Projektnamen angenommen';
  exception when check_violation then null; end;
  delete from public.memories;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.memories where user_id = '00000000-0000-4000-8000-00000000000a') then
    raise exception 'FEHLER: gelöschte Erinnerung liegt noch in der Tabelle';
  end if;
end $$;
rollback;
select 'Gedächtnis-Selbsttest bestanden' as ergebnis;
