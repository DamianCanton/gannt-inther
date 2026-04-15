-- Phase 5 hotfix: unblock dependencia insertions during atomic task mutations
--
-- Root cause:
-- The previous dependencias INSERT/UPDATE policies validated both tarea_id and
-- depende_de_id existence via subqueries against public.tareas. During RPC-based
-- atomic mutations, this can fail with RLS (42501) even when the graph mutation
-- is valid.
--
-- We keep strict project + obra scope checks in RLS and rely on:
-- - FK constraints for existence
-- - mutate_task_graph() domain validation for scope + cycle rules

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
);
