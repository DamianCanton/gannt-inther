create or replace function public.can_access_obra_read(target_project_id uuid, target_obra_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active()
    and (
      public.current_user_is_admin()
      or public.has_project_membership(target_project_id)
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
      public.current_user_is_admin()
      or public.has_project_membership(target_project_id)
      or exists (
        select 1
        from public.obra_memberships om
        where om.user_id = auth.uid()
          and om.obra_id = target_obra_id
          and om.role = 'editor'
      )
    );
$$;
