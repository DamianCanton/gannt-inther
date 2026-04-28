alter table public.profiles
  add column if not exists email text not null default '';

create index if not exists idx_profiles_email on public.profiles(email);

update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where p.user_id = u.id
  and coalesce(p.email, '') = '';

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    split_part(coalesce(new.email, ''), '@', 1)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

insert into public.profiles (user_id, email, display_name)
select
  u.id,
  coalesce(u.email, ''),
  split_part(coalesce(u.email, ''), '@', 1)
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles
for select
to authenticated
using (public.current_user_is_admin());
