-- Add audit trace for admin-created obra memberships

alter table public.obra_memberships
  add column if not exists created_by uuid references public.profiles(user_id) on delete set null;

create index if not exists idx_obra_memberships_created_by on public.obra_memberships(created_by);
