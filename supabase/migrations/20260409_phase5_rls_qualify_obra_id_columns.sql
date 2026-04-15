-- Phase 5 hotfix: disambiguate obra_id references in RLS policies
--
-- Root cause:
-- mutate_task_graph(obra_id => ...) runs under PL/pgSQL with a variable named
-- obra_id. Existing RLS policies used bare `obra_id` inside EXISTS subqueries,
-- which becomes ambiguous (42702) between policy row column and PL/pgSQL var.
--
-- Fix:
-- Qualify all policy row references as tareas.obra_id / dependencias.obra_id.

drop policy if exists tareas_insert_by_project on public.tareas;
create policy tareas_insert_by_project on public.tareas
for insert
to authenticated
with check (
  project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid())
  and exists (
    select 1
    from public.obras o
    where o.id = tareas.obra_id
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
    where o.id = tareas.obra_id
      and o.project_id = tareas.project_id
  )
);

drop policy if exists dependencias_insert_by_project on public.dependencias;
create policy dependencias_insert_by_project on public.dependencias
for insert
to authenticated
with check (
  project_id in (select p.project_id from public.project_memberships p where p.user_id = auth.uid())
  and exists (
    select 1
    from public.obras o
    where o.id = dependencias.obra_id
      and o.project_id = dependencias.project_id
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
    select 1
    from public.obras o
    where o.id = dependencias.obra_id
      and o.project_id = dependencias.project_id
  )
);
