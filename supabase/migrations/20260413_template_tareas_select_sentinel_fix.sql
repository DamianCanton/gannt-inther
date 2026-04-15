-- Fix: Allow authenticated users to SELECT global default template_tareas
-- The sentinel project_id ('00000000-...') holds default Type A/B/C templates,
-- but the original SELECT policy only checked project_memberships — making
-- global defaults invisible to all users. This migration adds a read-only
-- exception for sentinel rows while preserving write isolation.
--
-- INSERT/UPDATE/DELETE policies remain unchanged (no write access expansion).

-- Idempotent: drop + recreate
drop policy if exists template_tareas_select_by_project on public.template_tareas;

create policy template_tareas_select_by_project on public.template_tareas
for select
to authenticated
using (
  project_id in (
    select p.project_id
    from public.project_memberships p
    where p.user_id = auth.uid()
  )
  or project_id = '00000000-0000-0000-0000-000000000000'::uuid
);
