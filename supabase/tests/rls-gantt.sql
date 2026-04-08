-- RLS verification for gantt tables (P1 allowed, P2 denied)
-- Usage (example): psql "$SUPABASE_DB_URL" -f supabase/tests/rls-gantt.sql

begin;

-- NOTE: replace these UUIDs with test fixtures if needed.
do $$
declare
  p1 uuid := '11111111-1111-1111-1111-111111111111';
  p2 uuid := '22222222-2222-2222-2222-222222222222';
  user_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  user_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  obra_p1 uuid := '33333333-3333-3333-3333-333333333333';
  tarea_a uuid := '44444444-4444-4444-4444-444444444444';
  tarea_b uuid := '55555555-5555-5555-5555-555555555555';
begin
  insert into public.project_memberships (project_id, user_id, role)
  values (p1, user_a, 'member')
  on conflict do nothing;

  insert into public.obras (id, project_id, nombre, tipo_obra, fecha_inicio_global)
  values
    (obra_p1, p1, 'Obra P1', 'Tipo A', '2026-04-01')
  on conflict do nothing;

  insert into public.tareas (id, project_id, obra_id, nombre, duracion_dias, depende_de_id, orden)
  values
    (tarea_a, p1, obra_p1, 'Tarea A', 2, null, 1),
    (tarea_b, p1, obra_p1, 'Tarea B', 3, tarea_a, 2)
  on conflict do nothing;

  insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
  values (p1, obra_p1, tarea_b, tarea_a)
  on conflict do nothing;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('role', 'authenticated', true);

  -- Positive: should be able to read own project rows
  if not exists (select 1 from public.obras where project_id = p1) then
    raise exception 'RLS FAIL: expected read access for project P1';
  end if;

  if not exists (select 1 from public.tareas where project_id = p1 and obra_id = obra_p1) then
    raise exception 'RLS FAIL: expected read access to tareas in project P1';
  end if;

  if not exists (select 1 from public.dependencias where project_id = p1 and obra_id = obra_p1) then
    raise exception 'RLS FAIL: expected read access to dependencias in project P1';
  end if;

  -- Negative: should not see cross-project rows
  if exists (select 1 from public.obras where project_id = p2) then
    raise exception 'RLS FAIL: unexpected read access for project P2';
  end if;

  if exists (select 1 from public.tareas where project_id = p2) then
    raise exception 'RLS FAIL: unexpected tarea read access for project P2';
  end if;

  if exists (select 1 from public.dependencias where project_id = p2) then
    raise exception 'RLS FAIL: unexpected dependencia read access for project P2';
  end if;

  -- Switch user: should fail closed for P1 data
  perform set_config('request.jwt.claim.sub', user_b::text, true);

  if exists (select 1 from public.obras where project_id = p1) then
    raise exception 'RLS FAIL: user without membership should not read obras from P1';
  end if;

  if exists (select 1 from public.tareas where project_id = p1) then
    raise exception 'RLS FAIL: user without membership should not read tareas from P1';
  end if;

  if exists (select 1 from public.dependencias where project_id = p1) then
    raise exception 'RLS FAIL: user without membership should not read dependencias from P1';
  end if;
end
$$;

rollback;
