-- Phase 5 hotfix: avoid unnecessary dependency writes on task updates
--
-- Problem:
-- mutate_task_graph(update) always rewrote public.dependencias, even when
-- depende_de_id was unchanged. In environments where dependencias RLS is
-- stricter or lagging behind hotfixes, editing nombre/duracion could fail.
--
-- Fix:
-- Only rewrite dependencias when depende_de_id actually changes.

create or replace function public.mutate_task_graph(
  intent text,
  obra_id uuid,
  task_id uuid,
  payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_intent text := lower(trim(coalesce(intent, '')));
  v_obra_id uuid := obra_id;
  v_project_id uuid;
  v_task public.tareas%rowtype;
  v_task_id uuid := task_id;
  v_nombre text;
  v_duracion integer;
  v_depende_de_id uuid;
  v_next_orden integer;
begin
  if v_intent not in ('create', 'update', 'delete') then
    raise exception 'INVALID_INTENT';
  end if;

  select o.project_id
  into v_project_id
  from public.obras o
  where o.id = v_obra_id;

  if not found then
    raise exception 'FORBIDDEN_OR_NOT_FOUND';
  end if;

  if v_intent = 'create' then
    v_task_id := coalesce(v_task_id, gen_random_uuid());
    v_nombre := nullif(trim(payload->>'nombre'), '');
    v_duracion := (payload->>'duracion_dias')::integer;
    v_depende_de_id := (payload->>'depende_de_id')::uuid;

    if v_nombre is null then
      raise exception 'VALIDATION_ERROR:NOMBRE_REQUIRED';
    end if;
    if v_duracion is null or v_duracion < 1 then
      raise exception 'VALIDATION_ERROR:INVALID_DURATION';
    end if;

    if v_depende_de_id is not null then
      if v_depende_de_id = v_task_id then
        raise exception 'VALIDATION_ERROR:SELF_DEPENDENCY';
      end if;

      perform 1
      from public.tareas dep
      where dep.id = v_depende_de_id
        and dep.obra_id = v_obra_id
        and dep.project_id = v_project_id;

      if not found then
        raise exception 'VALIDATION_ERROR:DEPENDENCY_SCOPE';
      end if;
    end if;

    select coalesce(max(t.orden), 0) + 1
    into v_next_orden
    from public.tareas t
    where t.obra_id = v_obra_id
      and t.project_id = v_project_id;

    insert into public.tareas (
      id,
      project_id,
      obra_id,
      nombre,
      duracion_dias,
      depende_de_id,
      orden
    ) values (
      v_task_id,
      v_project_id,
      v_obra_id,
      v_nombre,
      v_duracion,
      v_depende_de_id,
      v_next_orden
    );

    delete from public.dependencias where tarea_id = v_task_id;

    if v_depende_de_id is not null then
      insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
      values (v_project_id, v_obra_id, v_task_id, v_depende_de_id);
    end if;

    return v_task_id;
  end if;

  select t.*
  into v_task
  from public.tareas t
  where t.id = v_task_id
    and t.obra_id = v_obra_id
    and t.project_id = v_project_id;

  if not found then
    raise exception 'FORBIDDEN_OR_NOT_FOUND';
  end if;

  if v_intent = 'update' then
    v_nombre := coalesce(nullif(trim(payload->>'nombre'), ''), v_task.nombre);

    if payload ? 'duracion_dias' then
      v_duracion := (payload->>'duracion_dias')::integer;
    else
      v_duracion := v_task.duracion_dias;
    end if;

    if payload ? 'depende_de_id' then
      v_depende_de_id := (payload->>'depende_de_id')::uuid;
    else
      v_depende_de_id := v_task.depende_de_id;
    end if;

    if v_nombre is null then
      raise exception 'VALIDATION_ERROR:NOMBRE_REQUIRED';
    end if;

    if v_duracion is null or v_duracion < 1 then
      raise exception 'VALIDATION_ERROR:INVALID_DURATION';
    end if;

    if v_depende_de_id is not null and v_depende_de_id = v_task_id then
      raise exception 'VALIDATION_ERROR:SELF_DEPENDENCY';
    end if;

    if v_depende_de_id is not null then
      perform 1
      from public.tareas dep
      where dep.id = v_depende_de_id
        and dep.obra_id = v_obra_id
        and dep.project_id = v_project_id;

      if not found then
        raise exception 'VALIDATION_ERROR:DEPENDENCY_SCOPE';
      end if;

      if exists (
        with recursive predecessor_chain as (
          select t.id, t.depende_de_id, array[t.id]::uuid[] as path
          from public.tareas t
          where t.id = v_depende_de_id
            and t.obra_id = v_obra_id
            and t.project_id = v_project_id

          union all

          select next_t.id, next_t.depende_de_id, chain.path || next_t.id
          from public.tareas next_t
          join predecessor_chain chain
            on next_t.id = chain.depende_de_id
          where next_t.obra_id = v_obra_id
            and next_t.project_id = v_project_id
            and not (next_t.id = any(chain.path))
        )
        select 1
        from predecessor_chain
        where id = v_task_id
      ) then
        raise exception 'DEPENDENCY_CYCLE';
      end if;
    end if;

    update public.tareas t
    set
      nombre = v_nombre,
      duracion_dias = v_duracion,
      depende_de_id = v_depende_de_id
    where t.id = v_task_id
      and t.obra_id = v_obra_id
      and t.project_id = v_project_id;

    if v_depende_de_id is distinct from v_task.depende_de_id then
      delete from public.dependencias
      where tarea_id = v_task_id;

      if v_depende_de_id is not null then
        insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
        values (v_project_id, v_obra_id, v_task_id, v_depende_de_id);
      end if;
    end if;

    return v_task_id;
  end if;

  -- delete intent
  delete from public.dependencias d
  where d.project_id = v_project_id
    and d.obra_id = v_obra_id
    and (d.tarea_id = v_task_id or d.depende_de_id = v_task_id);

  update public.tareas t
  set depende_de_id = null
  where t.project_id = v_project_id
    and t.obra_id = v_obra_id
    and t.depende_de_id = v_task_id;

  delete from public.tareas t
  where t.id = v_task_id
    and t.project_id = v_project_id
    and t.obra_id = v_obra_id;

  with ordered as (
    select
      t.id,
      row_number() over (order by t.orden, t.id)::integer as normalized_orden
    from public.tareas t
    where t.project_id = v_project_id
      and t.obra_id = v_obra_id
  )
  update public.tareas t
  set orden = o.normalized_orden
  from ordered o
  where t.id = o.id
    and t.orden is distinct from o.normalized_orden;

  return v_task_id;
end;
$$;
