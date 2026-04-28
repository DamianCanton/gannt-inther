-- Normaliza catálogo de proyectos para membresías granulares.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_nombre on public.projects(nombre);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

insert into public.projects (id, nombre)
select src.project_id, 'Proyecto ' || left(src.project_id::text, 8)
from (
  select distinct pm.project_id
  from public.project_memberships pm
  where pm.project_id is not null
  union
  select distinct o.project_id
  from public.obras o
  where o.project_id is not null
) as src
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_memberships_project_id_fkey'
      and conrelid = 'public.project_memberships'::regclass
  ) then
    alter table public.project_memberships
      add constraint project_memberships_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
end;
$$;

alter table public.projects enable row level security;

drop policy if exists projects_select_by_membership on public.projects;
create policy projects_select_by_membership on public.projects
for select
to authenticated
using (public.current_user_is_admin() or public.has_project_membership(projects.id));

drop policy if exists projects_insert_admin_only on public.projects;
create policy projects_insert_admin_only on public.projects
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists projects_update_admin_only on public.projects;
create policy projects_update_admin_only on public.projects
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists projects_delete_admin_only on public.projects;
create policy projects_delete_admin_only on public.projects
for delete
to authenticated
using (public.current_user_is_admin());
