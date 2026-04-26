-- Phase 1 (hierarchy-first): add one-level parent/child model fields on tareas.
-- V1 rules:
--   - parent tasks => parent_id is null, offset_dias = 0
--   - child tasks  => parent_id points to a top-level task in same obra/project
--   - only one hierarchy level allowed (no parent -> child -> grandchild chains)

alter table public.tareas
  add column if not exists parent_id uuid references public.tareas(id) on delete cascade;

alter table public.tareas
  add column if not exists offset_dias integer;

update public.tareas
set offset_dias = 0
where offset_dias is null;

alter table public.tareas
  alter column offset_dias set default 0;

alter table public.tareas
  alter column offset_dias set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tareas_offset_dias_non_negative'
      and conrelid = 'public.tareas'::regclass
  ) then
    alter table public.tareas
      add constraint tareas_offset_dias_non_negative
      check (offset_dias >= 0);
  end if;
end
$$;

create index if not exists idx_tareas_parent_id on public.tareas(parent_id);

create or replace function public.validate_tarea_parent_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent public.tareas%rowtype;
begin
  -- Top-level tasks: force safe default offset.
  if new.parent_id is null then
    if new.offset_dias is null then
      new.offset_dias := 0;
    end if;

    if new.offset_dias <> 0 then
      raise exception 'VALIDATION_ERROR:ROOT_OFFSET_MUST_BE_ZERO';
    end if;

    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'VALIDATION_ERROR:SELF_PARENT';
  end if;

  select t.*
  into v_parent
  from public.tareas t
  where t.id = new.parent_id;

  if not found then
    raise exception 'VALIDATION_ERROR:PARENT_NOT_FOUND';
  end if;

  if v_parent.project_id is distinct from new.project_id
     or v_parent.obra_id is distinct from new.obra_id then
    raise exception 'VALIDATION_ERROR:PARENT_SCOPE';
  end if;

  -- One-level hierarchy guard: parent cannot already be a child.
  if v_parent.parent_id is not null then
    raise exception 'VALIDATION_ERROR:HIERARCHY_DEPTH_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tareas_validate_parent_hierarchy on public.tareas;
create trigger trg_tareas_validate_parent_hierarchy
before insert or update on public.tareas
for each row execute function public.validate_tarea_parent_hierarchy();
