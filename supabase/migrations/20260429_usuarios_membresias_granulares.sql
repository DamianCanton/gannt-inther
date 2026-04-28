-- Usuarios y membresías granulares por obra

create table if not exists public.obra_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obra_memberships_unique_user_obra unique (user_id, obra_id)
);

create index if not exists idx_obra_memberships_user_id on public.obra_memberships(user_id);
create index if not exists idx_obra_memberships_obra_id on public.obra_memberships(obra_id);

drop trigger if exists trg_obra_memberships_updated_at on public.obra_memberships;
create trigger trg_obra_memberships_updated_at
before update on public.obra_memberships
for each row execute function public.set_updated_at();

alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists global_role text not null default 'member';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_global_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_global_role_check
      check (global_role in ('member', 'admin'));
  end if;
end;
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_active = true
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active()
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.global_role = 'admin'
    );
$$;

create or replace function public.has_project_membership(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active()
    and exists (
      select 1
      from public.project_memberships pm
      where pm.user_id = auth.uid()
        and pm.project_id = target_project_id
    );
$$;

create or replace function public.can_access_obra_read(target_project_id uuid, target_obra_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active()
    and (
      public.has_project_membership(target_project_id)
      or exists (
        select 1
        from public.obra_memberships om
        where om.user_id = auth.uid()
          and om.obra_id = target_obra_id
      )
    );
$$;

create or replace function public.can_access_obra_write(target_project_id uuid, target_obra_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active()
    and (
      public.has_project_membership(target_project_id)
      or exists (
        select 1
        from public.obra_memberships om
        where om.user_id = auth.uid()
          and om.obra_id = target_obra_id
          and om.role = 'editor'
      )
    );
$$;

alter table public.obra_memberships enable row level security;

drop policy if exists obra_memberships_select_admin_or_self on public.obra_memberships;
create policy obra_memberships_select_admin_or_self on public.obra_memberships
for select
to authenticated
using (
  public.current_user_is_admin()
  or (public.current_user_is_active() and user_id = auth.uid())
);

drop policy if exists obra_memberships_insert_admin_only on public.obra_memberships;
create policy obra_memberships_insert_admin_only on public.obra_memberships
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists obra_memberships_update_admin_only on public.obra_memberships;
create policy obra_memberships_update_admin_only on public.obra_memberships
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists obra_memberships_delete_admin_only on public.obra_memberships;
create policy obra_memberships_delete_admin_only on public.obra_memberships
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_admin_read_all on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select
to authenticated
using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists profiles_update_own_active on public.profiles;
create policy profiles_update_own_active on public.profiles
for update
to authenticated
using (auth.uid() = user_id and public.current_user_is_active())
with check (auth.uid() = user_id and public.current_user_is_active());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists obras_select_by_project on public.obras;
drop policy if exists obras_insert_by_project on public.obras;
drop policy if exists obras_update_by_project on public.obras;
drop policy if exists obras_delete_by_project on public.obras;

drop policy if exists obras_select_by_membership on public.obras;
create policy obras_select_by_membership on public.obras
for select
to authenticated
using (public.can_access_obra_read(obras.project_id, obras.id));

drop policy if exists obras_insert_by_membership on public.obras;
create policy obras_insert_by_membership on public.obras
for insert
to authenticated
with check (
  public.current_user_is_active()
  and public.has_project_membership(obras.project_id)
);

drop policy if exists obras_update_by_membership on public.obras;
create policy obras_update_by_membership on public.obras
for update
to authenticated
using (public.can_access_obra_write(obras.project_id, obras.id))
with check (public.can_access_obra_write(obras.project_id, obras.id));

drop policy if exists obras_delete_by_membership on public.obras;
create policy obras_delete_by_membership on public.obras
for delete
to authenticated
using (public.can_access_obra_write(obras.project_id, obras.id));

drop policy if exists tareas_select_by_project on public.tareas;
drop policy if exists tareas_insert_by_project on public.tareas;
drop policy if exists tareas_update_by_project on public.tareas;
drop policy if exists tareas_delete_by_project on public.tareas;

drop policy if exists tareas_select_by_membership on public.tareas;
create policy tareas_select_by_membership on public.tareas
for select
to authenticated
using (public.can_access_obra_read(tareas.project_id, tareas.obra_id));

drop policy if exists tareas_insert_by_membership on public.tareas;
create policy tareas_insert_by_membership on public.tareas
for insert
to authenticated
with check (
  public.can_access_obra_write(tareas.project_id, tareas.obra_id)
  and exists (
    select 1
    from public.obras o
    where o.id = tareas.obra_id
      and o.project_id = tareas.project_id
  )
);

drop policy if exists tareas_update_by_membership on public.tareas;
create policy tareas_update_by_membership on public.tareas
for update
to authenticated
using (public.can_access_obra_write(tareas.project_id, tareas.obra_id))
with check (
  public.can_access_obra_write(tareas.project_id, tareas.obra_id)
  and exists (
    select 1
    from public.obras o
    where o.id = tareas.obra_id
      and o.project_id = tareas.project_id
  )
);

drop policy if exists tareas_delete_by_membership on public.tareas;
create policy tareas_delete_by_membership on public.tareas
for delete
to authenticated
using (public.can_access_obra_write(tareas.project_id, tareas.obra_id));

drop policy if exists dependencias_select_by_project on public.dependencias;
drop policy if exists dependencias_insert_by_project on public.dependencias;
drop policy if exists dependencias_update_by_project on public.dependencias;
drop policy if exists dependencias_delete_by_project on public.dependencias;

drop policy if exists dependencias_select_by_membership on public.dependencias;
create policy dependencias_select_by_membership on public.dependencias
for select
to authenticated
using (public.can_access_obra_read(dependencias.project_id, dependencias.obra_id));

drop policy if exists dependencias_insert_by_membership on public.dependencias;
create policy dependencias_insert_by_membership on public.dependencias
for insert
to authenticated
with check (
  public.can_access_obra_write(dependencias.project_id, dependencias.obra_id)
  and exists (
    select 1
    from public.obras o
    where o.id = dependencias.obra_id
      and o.project_id = dependencias.project_id
  )
);

drop policy if exists dependencias_update_by_membership on public.dependencias;
create policy dependencias_update_by_membership on public.dependencias
for update
to authenticated
using (public.can_access_obra_write(dependencias.project_id, dependencias.obra_id))
with check (
  public.can_access_obra_write(dependencias.project_id, dependencias.obra_id)
  and exists (
    select 1
    from public.obras o
    where o.id = dependencias.obra_id
      and o.project_id = dependencias.project_id
  )
);

drop policy if exists dependencias_delete_by_membership on public.dependencias;
create policy dependencias_delete_by_membership on public.dependencias
for delete
to authenticated
using (public.can_access_obra_write(dependencias.project_id, dependencias.obra_id));
