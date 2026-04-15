-- Phase 1: Template bootstrapping schema + RPC + seed data
-- Implements template_tareas, create_obra_with_tasks RPC, and default Type A/B/C templates.

-- ============================================================
-- 1. template_tareas table
-- ============================================================

create table if not exists public.template_tareas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  tipo_obra text not null check (tipo_obra in ('Tipo A', 'Tipo B', 'Tipo C')),
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  nombre text not null,
  duracion_dias integer not null check (duracion_dias > 0),
  depende_de_template_id uuid references public.template_tareas(id) on delete set null,
  orden integer not null check (orden >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ensures each template row belongs to a unique (project, type, version) context
  constraint template_tareas_self_ref_scope check (
    depende_de_template_id is null or depende_de_template_id <> id
  )
);

create index if not exists idx_template_tareas_project_id
  on public.template_tareas(project_id);

create index if not exists idx_template_tareas_tipo_obra
  on public.template_tareas(tipo_obra);

create index if not exists idx_template_tareas_version
  on public.template_tareas(project_id, tipo_obra, version);

-- ============================================================
-- 2. Updated_at trigger for template_tareas
-- ============================================================

drop trigger if exists trg_template_tareas_updated_at on public.template_tareas;
create trigger trg_template_tareas_updated_at
before update on public.template_tareas
for each row execute function public.set_updated_at();

-- ============================================================
-- 3. RLS for template_tareas
-- ============================================================

alter table public.template_tareas enable row level security;

drop policy if exists template_tareas_select_by_project on public.template_tareas;
create policy template_tareas_select_by_project on public.template_tareas
for select
to authenticated
using (project_id in (
  select p.project_id from public.project_memberships p where p.user_id = auth.uid()
));

drop policy if exists template_tareas_insert_by_project on public.template_tareas;
create policy template_tareas_insert_by_project on public.template_tareas
for insert
to authenticated
with check (project_id in (
  select p.project_id from public.project_memberships p where p.user_id = auth.uid()
));

drop policy if exists template_tareas_update_by_project on public.template_tareas;
create policy template_tareas_update_by_project on public.template_tareas
for update
to authenticated
using (project_id in (
  select p.project_id from public.project_memberships p where p.user_id = auth.uid()
))
with check (project_id in (
  select p.project_id from public.project_memberships p where p.user_id = auth.uid()
));

drop policy if exists template_tareas_delete_by_project on public.template_tareas;
create policy template_tareas_delete_by_project on public.template_tareas
for delete
to authenticated
using (project_id in (
  select p.project_id from public.project_memberships p where p.user_id = auth.uid()
));

-- ============================================================
-- 4. create_obra_with_tasks RPC (atomic bootstrap)
-- ============================================================

create or replace function public.create_obra_with_tasks(
  p_project_id uuid,
  p_nombre text,
  p_cliente text,
  p_tipo_obra text,
  p_fecha_inicio_global date,
  p_vigencia_texto text,
  p_tareas jsonb  -- array of { id, nombre, duracion_dias, depende_de_id, orden, fecha_inicio, fecha_fin }
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_obra_id uuid;
  v_tarea jsonb;
  v_tarea_id uuid;
  v_dep_id uuid;
begin
  -- Insert obra header
  insert into public.obras (id, project_id, nombre, cliente, tipo_obra, fecha_inicio_global, vigencia_texto)
  values (gen_random_uuid(), p_project_id, p_nombre, p_cliente, p_tipo_obra, p_fecha_inicio_global, p_vigencia_texto)
  returning id into v_obra_id;

  -- Insert all tareas from precomputed payload
  for v_tarea in select * from jsonb_array_elements(p_tareas)
  loop
    v_tarea_id := (v_tarea->>'id')::uuid;

    insert into public.tareas (
      id, project_id, obra_id, nombre, duracion_dias, depende_de_id, orden
    ) values (
      v_tarea_id,
      p_project_id,
      v_obra_id,
      v_tarea->>'nombre',
      (v_tarea->>'duracion_dias')::integer,
      null,  -- dependencies resolved below
      (v_tarea->>'orden')::integer
    );
  end loop;

  -- Resolve dependencies: map template dependency IDs to actual tarea IDs
  -- The payload includes a mapping from template_id -> tarea_id
  -- We use the depende_de_id from payload which is already resolved to the new tarea UUID
  for v_tarea in select * from jsonb_array_elements(p_tareas)
  loop
    v_tarea_id := (v_tarea->>'id')::uuid;
    v_dep_id := (v_tarea->>'depende_de_id')::uuid;

    if v_dep_id is not null then
      update public.tareas
      set depende_de_id = v_dep_id
      where id = v_tarea_id
        and obra_id = v_obra_id
        and project_id = p_project_id;

      insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
      values (p_project_id, v_obra_id, v_tarea_id, v_dep_id);
    end if;
  end loop;

  return v_obra_id;
end;
$$;

-- ============================================================
-- 5. Seed default templates (project-scoped, version=1, published)
--    These use a sentinel project_id = '00000000-0000-0000-0000-000000000000'
--    which acts as "global defaults". The application layer copies these
--    to new projects on first access or when creating an obra.
-- ============================================================

-- ============================================================
-- TIPO A: Simple structure (3 tasks, linear)
--   A1 → A2 → A3
-- ============================================================
do $$
declare
  v_project_id uuid := '00000000-0000-0000-0000-000000000000';
  v_a1_id uuid := gen_random_uuid();
  v_a2_id uuid := gen_random_uuid();
  v_a3_id uuid := gen_random_uuid();
begin
  -- Task 1: Preparación del terreno
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_a1_id, v_project_id, 'Tipo A', 1, 'published', 'Preparación del terreno', 5, null, 1);

  -- Task 2: Estructura principal
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_a2_id, v_project_id, 'Tipo A', 1, 'published', 'Estructura principal', 10, v_a1_id, 2);

  -- Task 3: Acabados finales
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_a3_id, v_project_id, 'Tipo A', 1, 'published', 'Acabados finales', 7, v_a2_id, 3);
end $$;

-- ============================================================
-- TIPO B: Medium structure (5 tasks, one parallel branch)
--   B1 → B2 → B4 (main path)
--   B1 → B3 → B4 (parallel path)
-- ============================================================
do $$
declare
  v_project_id uuid := '00000000-0000-0000-0000-000000000000';
  v_b1_id uuid := gen_random_uuid();
  v_b2_id uuid := gen_random_uuid();
  v_b3_id uuid := gen_random_uuid();
  v_b4_id uuid := gen_random_uuid();
  v_b5_id uuid := gen_random_uuid();
begin
  -- Task 1: Excavación y cimentación
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_b1_id, v_project_id, 'Tipo B', 1, 'published', 'Excavación y cimentación', 7, null, 1);

  -- Task 2: Estructura metálica (depends on B1)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_b2_id, v_project_id, 'Tipo B', 1, 'published', 'Estructura metálica', 12, v_b1_id, 2);

  -- Task 3: Instalaciones eléctricas (depends on B1, parallel to B2)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_b3_id, v_project_id, 'Tipo B', 1, 'published', 'Instalaciones eléctricas', 8, v_b1_id, 3);

  -- Task 4: Revestimientos (depends on both B2 and B3 — merge point)
  -- Note: Only ONE depende_de_id is allowed per row. We model the merge via dependencias table.
  -- For simplicity in template, we link to the longer path (B2).
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_b4_id, v_project_id, 'Tipo B', 1, 'published', 'Revestimientos', 10, v_b2_id, 4);

  -- Task 5: Inspección final
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_b5_id, v_project_id, 'Tipo B', 1, 'published', 'Inspección final', 3, v_b4_id, 5);
end $$;

-- ============================================================
-- TIPO C: Complex structure (8 tasks, multiple branches and merges)
--   C1 → C2 → C5 → C7 → C8
--   C1 → C3 → C6 ↗
--   C1 → C4 ↗
-- ============================================================
do $$
declare
  v_project_id uuid := '00000000-0000-0000-0000-000000000000';
  v_c1_id uuid := gen_random_uuid();
  v_c2_id uuid := gen_random_uuid();
  v_c3_id uuid := gen_random_uuid();
  v_c4_id uuid := gen_random_uuid();
  v_c5_id uuid := gen_random_uuid();
  v_c6_id uuid := gen_random_uuid();
  v_c7_id uuid := gen_random_uuid();
  v_c8_id uuid := gen_random_uuid();
begin
  -- Task 1: Demolición y limpieza
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c1_id, v_project_id, 'Tipo C', 1, 'published', 'Demolición y limpieza', 4, null, 1);

  -- Task 2: Cimentación profunda (depends on C1)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c2_id, v_project_id, 'Tipo C', 1, 'published', 'Cimentación profunda', 14, v_c1_id, 2);

  -- Task 3: Estructura de hormigón (depends on C1)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c3_id, v_project_id, 'Tipo C', 1, 'published', 'Estructura de hormigón', 20, v_c1_id, 3);

  -- Task 4: Impermeabilización (depends on C1)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c4_id, v_project_id, 'Tipo C', 1, 'published', 'Impermeabilización', 6, v_c1_id, 4);

  -- Task 5: Instalación mecánica (depends on C2)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c5_id, v_project_id, 'Tipo C', 1, 'published', 'Instalación mecánica', 10, v_c2_id, 5);

  -- Task 6: Aislamiento térmico (depends on C3)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c6_id, v_project_id, 'Tipo C', 1, 'published', 'Aislamiento térmico', 5, v_c3_id, 6);

  -- Task 7: Fachada exterior (depends on C5 — main path merge)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c7_id, v_project_id, 'Tipo C', 1, 'published', 'Fachada exterior', 12, v_c5_id, 7);

  -- Task 8: Entrega y documentación (depends on C7)
  insert into public.template_tareas (id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden)
  values (v_c8_id, v_project_id, 'Tipo C', 1, 'published', 'Entrega y documentación', 4, v_c7_id, 8);
end $$;
