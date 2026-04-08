-- Implementación inicial Gantt desde blueprint
-- Phase 1: Foundation + Datos/RLS

create extension if not exists "pgcrypto";

create table if not exists public.project_memberships (
  project_id uuid not null,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  nombre text not null,
  cliente text,
  tipo_obra text not null check (tipo_obra in ('Tipo A', 'Tipo B', 'Tipo C')),
  fecha_inicio_global date not null,
  vigencia_texto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feriados (
  fecha date primary key,
  descripcion text
);

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  obra_id uuid not null references public.obras(id) on delete cascade,
  nombre text not null,
  duracion_dias integer not null check (duracion_dias > 0),
  depende_de_id uuid references public.tareas(id) on delete set null,
  orden integer not null check (orden >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dependencias (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  obra_id uuid not null references public.obras(id) on delete cascade,
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  depende_de_id uuid not null references public.tareas(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dependencias_not_self check (tarea_id <> depende_de_id),
  constraint dependencias_unique unique (tarea_id, depende_de_id)
);

create index if not exists idx_obras_project_id on public.obras(project_id);
create index if not exists idx_tareas_project_id on public.tareas(project_id);
create index if not exists idx_tareas_obra_id on public.tareas(obra_id);
create index if not exists idx_tareas_depende_de_id on public.tareas(depende_de_id);
create index if not exists idx_tareas_orden on public.tareas(orden);
create index if not exists idx_dependencias_project_id on public.dependencias(project_id);
create index if not exists idx_dependencias_obra_id on public.dependencias(obra_id);
create index if not exists idx_dependencias_tarea_id on public.dependencias(tarea_id);
create index if not exists idx_dependencias_depende_de_id on public.dependencias(depende_de_id);
create index if not exists idx_feriados_fecha on public.feriados(fecha);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_obras_updated_at on public.obras;
create trigger trg_obras_updated_at
before update on public.obras
for each row execute function public.set_updated_at();

drop trigger if exists trg_tareas_updated_at on public.tareas;
create trigger trg_tareas_updated_at
before update on public.tareas
for each row execute function public.set_updated_at();

alter table public.obras enable row level security;
alter table public.tareas enable row level security;
alter table public.dependencias enable row level security;
alter table public.feriados enable row level security;

drop policy if exists obras_select_by_project on public.obras;
create policy obras_select_by_project on public.obras
for select
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists obras_insert_by_project on public.obras;
create policy obras_insert_by_project on public.obras
for insert
to authenticated
with check (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists obras_update_by_project on public.obras;
create policy obras_update_by_project on public.obras
for update
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()))
with check (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists obras_delete_by_project on public.obras;
create policy obras_delete_by_project on public.obras
for delete
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists tareas_select_by_project on public.tareas;
create policy tareas_select_by_project on public.tareas
for select
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists tareas_insert_by_project on public.tareas;
create policy tareas_insert_by_project on public.tareas
for insert
to authenticated
with check (
  project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid())
  and exists (
    select 1
    from public.obras o
    where o.id = obra_id
      and o.project_id = tareas.project_id
  )
);

drop policy if exists tareas_update_by_project on public.tareas;
create policy tareas_update_by_project on public.tareas
for update
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()))
with check (
  project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid())
  and exists (
    select 1
    from public.obras o
    where o.id = obra_id
      and o.project_id = tareas.project_id
  )
);

drop policy if exists tareas_delete_by_project on public.tareas;
create policy tareas_delete_by_project on public.tareas
for delete
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists dependencias_select_by_project on public.dependencias;
create policy dependencias_select_by_project on public.dependencias
for select
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists dependencias_insert_by_project on public.dependencias;
create policy dependencias_insert_by_project on public.dependencias
for insert
to authenticated
with check (
  project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid())
  and exists (
    select 1 from public.obras o
    where o.id = obra_id
      and o.project_id = dependencias.project_id
  )
  and exists (
    select 1 from public.tareas t1
    where t1.id = tarea_id
      and t1.project_id = dependencias.project_id
      and t1.obra_id = dependencias.obra_id
  )
  and exists (
    select 1 from public.tareas t2
    where t2.id = depende_de_id
      and t2.project_id = dependencias.project_id
      and t2.obra_id = dependencias.obra_id
  )
);

drop policy if exists dependencias_update_by_project on public.dependencias;
create policy dependencias_update_by_project on public.dependencias
for update
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()))
with check (
  project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid())
  and exists (
    select 1 from public.obras o
    where o.id = obra_id
      and o.project_id = dependencias.project_id
  )
  and exists (
    select 1 from public.tareas t1
    where t1.id = tarea_id
      and t1.project_id = dependencias.project_id
      and t1.obra_id = dependencias.obra_id
  )
  and exists (
    select 1 from public.tareas t2
    where t2.id = depende_de_id
      and t2.project_id = dependencias.project_id
      and t2.obra_id = dependencias.obra_id
  )
);

drop policy if exists dependencias_delete_by_project on public.dependencias;
create policy dependencias_delete_by_project on public.dependencias
for delete
to authenticated
using (project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid()));

drop policy if exists feriados_select_authenticated on public.feriados;
create policy feriados_select_authenticated on public.feriados
for select
to authenticated
using (true);

drop policy if exists feriados_write_service_role on public.feriados;
create policy feriados_write_service_role on public.feriados
for all
to service_role
using (true)
with check (true);
