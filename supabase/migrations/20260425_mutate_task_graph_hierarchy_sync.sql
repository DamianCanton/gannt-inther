-- Hierarchy write-path fix for mutate_task_graph RPC.
-- Persists parent_id/offset_dias on create+update and keeps parent
-- duracion_dias derived from children span when children exist.

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
  v_parent_id uuid;
  v_offset_dias integer;
  v_next_orden integer;

  -- Smart insert fields
  v_smart_insert jsonb := payload->'smart_insert';
  v_smart_strategy text;
  v_conflict_parent_id uuid;
  v_conflict_child_id uuid;
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

  -- ============================================================
  -- Smart Insert: pre-flight edge remapping (shared by create/update)
  -- ============================================================
  if v_smart_insert is not null then
    v_smart_strategy := lower(trim(coalesce(v_smart_insert->>'strategy', '')));
    v_conflict_parent_id := (v_smart_insert->>'conflictParentId')::uuid;
    v_conflict_child_id := (v_smart_insert->>'conflictChildId')::uuid;

    if v_smart_strategy not in ('insert', 'branch') then
      raise exception 'VALIDATION_ERROR:INVALID_SMART_STRATEGY';
    end if;

    if v_conflict_parent_id is null or v_conflict_child_id is null then
      raise exception 'VALIDATION_ERROR:SMART_INSERT_MISSING_IDS';
    end if;

    -- Validate both tasks exist in scope
    perform 1 from public.tareas t
    where t.id = v_conflict_parent_id
      and t.obra_id = v_obra_id
      and t.project_id = v_project_id;

    if not found then
      raise exception 'VALIDATION_ERROR:SMART_PARENT_NOT_FOUND';
    end if;

    perform 1 from public.tareas t
    where t.id = v_conflict_child_id
      and t.obra_id = v_obra_id
      and t.project_id = v_project_id;

    if not found then
      raise exception 'VALIDATION_ERROR:SMART_CHILD_NOT_FOUND';
    end if;

    if v_smart_strategy = 'insert' then
      -- Insert: remove the direct parent -> child edge.
      -- The new task will be linked: parent -> new_task -> child.
      delete from public.dependencias
      where dependencias.project_id = v_project_id
        and dependencias.obra_id = v_obra_id
        and dependencias.tarea_id = v_conflict_child_id
        and dependencias.depende_de_id = v_conflict_parent_id;

      update public.tareas
      set depende_de_id = null
      where tareas.id = v_conflict_child_id
        and tareas.project_id = v_project_id
        and tareas.obra_id = v_obra_id
        and tareas.depende_de_id = v_conflict_parent_id;

    -- branch strategy: no edge removal, parent -> child stays,
    -- new task gets parent as dependency (parallel).
    end if;
  end if;

  -- ============================================================
  -- Standard create intent
  -- ============================================================
  if v_intent = 'create' then
    v_task_id := coalesce(v_task_id, gen_random_uuid());
    v_nombre := nullif(trim(payload->>'nombre'), '');
    v_duracion := (payload->>'duracion_dias')::integer;
    v_depende_de_id := (payload->>'depende_de_id')::uuid;
    v_parent_id := (payload->>'parent_id')::uuid;
    v_offset_dias := coalesce((payload->>'offset_dias')::integer, 0);

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

    if v_parent_id is not null and v_depende_de_id is not null then
      raise exception 'VALIDATION_ERROR:CHILD_CANNOT_HAVE_DEPENDENCY';
    end if;

    -- Determine v_next_orden based on smart_insert strategy or default to max+1.
    -- En ambas estrategias, visualmente la tarea va justo abajo del padre (orden + 1)
    if v_smart_insert is not null then
      select coalesce(t.orden + 1, 1)
      into v_next_orden
      from public.tareas t
      where t.id = v_conflict_parent_id
        and t.obra_id = v_obra_id
        and t.project_id = v_project_id;

      if v_next_orden is null then
        v_next_orden := 1;
      end if;

      -- Shift all tasks with orden >= v_next_orden down by 1 to make room.
      update public.tareas
      set orden = orden + 1
      where tareas.obra_id = v_obra_id
        and tareas.project_id = v_project_id
        and tareas.orden >= v_next_orden;
    else
      select coalesce(max(t.orden), 0) + 1
      into v_next_orden
      from public.tareas t
      where t.obra_id = v_obra_id
        and t.project_id = v_project_id;
    end if;

    insert into public.tareas (
      id,
      project_id,
      obra_id,
      nombre,
      duracion_dias,
      depende_de_id,
      parent_id,
      offset_dias,
      orden
    ) values (
      v_task_id,
      v_project_id,
      v_obra_id,
      v_nombre,
      v_duracion,
      v_depende_de_id,
      v_parent_id,
      v_offset_dias,
      v_next_orden
    );

    delete from public.dependencias where dependencias.tarea_id = v_task_id;

    if v_depende_de_id is not null then
      insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
      values (v_project_id, v_obra_id, v_task_id, v_depende_de_id);
    end if;

    -- Smart Insert (create + insert): also wire new_task -> conflictChild
    if v_smart_insert is not null and v_smart_strategy = 'insert' then
      -- Remove any existing dependency pointing to the child from another source
      -- (already removed in pre-flight above).

      -- Wire: new_task -> conflictChild
      update public.tareas
      set depende_de_id = v_task_id
      where tareas.id = v_conflict_child_id
        and tareas.project_id = v_project_id
        and tareas.obra_id = v_obra_id;

      insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
      values (v_project_id, v_obra_id, v_conflict_child_id, v_task_id)
      on conflict (tarea_id) do update set depende_de_id = excluded.depende_de_id;
    end if;

    with parent_span as (
      select
        child.parent_id,
        max(child.offset_dias + child.duracion_dias)::integer as derived_duration
      from public.tareas child
      where child.parent_id = v_parent_id
        and child.project_id = v_project_id
        and child.obra_id = v_obra_id
      group by child.parent_id
    )
    update public.tareas parent
    set duracion_dias = parent_span.derived_duration
    from parent_span
    where parent.id = parent_span.parent_id
      and parent.project_id = v_project_id
      and parent.obra_id = v_obra_id
      and parent.duracion_dias is distinct from parent_span.derived_duration;

    return v_task_id;
  end if;

  -- ============================================================
  -- Standard update intent
  -- ============================================================

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

    if payload ? 'parent_id' then
      v_parent_id := (payload->>'parent_id')::uuid;
    else
      v_parent_id := v_task.parent_id;
    end if;

    if payload ? 'offset_dias' then
      v_offset_dias := coalesce((payload->>'offset_dias')::integer, 0);
    else
      v_offset_dias := coalesce(v_task.offset_dias, 0);
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

    if v_parent_id is not null and v_depende_de_id is not null then
      raise exception 'VALIDATION_ERROR:CHILD_CANNOT_HAVE_DEPENDENCY';
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

    update public.tareas
    set
      nombre = v_nombre,
      duracion_dias = v_duracion,
      depende_de_id = v_depende_de_id,
      parent_id = v_parent_id,
      offset_dias = v_offset_dias
    where tareas.id = v_task_id
      and tareas.obra_id = v_obra_id
      and tareas.project_id = v_project_id;

    delete from public.dependencias
    where dependencias.tarea_id = v_task_id;

    if v_depende_de_id is not null then
      insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
      values (v_project_id, v_obra_id, v_task_id, v_depende_de_id);
    end if;

    -- Smart Insert (update + insert): also wire updated_task -> conflictChild
    if v_smart_insert is not null and v_smart_strategy = 'insert' then
      update public.tareas
      set depende_de_id = v_task_id
      where tareas.id = v_conflict_child_id
        and tareas.project_id = v_project_id
        and tareas.obra_id = v_obra_id;

      insert into public.dependencias (project_id, obra_id, tarea_id, depende_de_id)
      values (v_project_id, v_obra_id, v_conflict_child_id, v_task_id)
      on conflict (tarea_id) do update set depende_de_id = excluded.depende_de_id;
    end if;

    with affected_parent_ids as (
      select distinct parent_id
      from (
        values (v_task.parent_id), (v_parent_id), (v_task_id)
      ) as ids(parent_id)
      where parent_id is not null
    ),
    parent_span as (
      select
        child.parent_id,
        max(child.offset_dias + child.duracion_dias)::integer as derived_duration
      from public.tareas child
      join affected_parent_ids ap on ap.parent_id = child.parent_id
      where child.project_id = v_project_id
        and child.obra_id = v_obra_id
      group by child.parent_id
    )
    update public.tareas parent
    set duracion_dias = parent_span.derived_duration
    from parent_span
    where parent.id = parent_span.parent_id
      and parent.project_id = v_project_id
      and parent.obra_id = v_obra_id
      and parent.duracion_dias is distinct from parent_span.derived_duration;

    return v_task_id;
  end if;

  -- ============================================================
  -- delete intent
  -- ============================================================
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

  with parent_span as (
    select
      child.parent_id,
      max(child.offset_dias + child.duracion_dias)::integer as derived_duration
    from public.tareas child
    where child.parent_id = v_task.parent_id
      and child.project_id = v_project_id
      and child.obra_id = v_obra_id
    group by child.parent_id
  )
  update public.tareas parent
  set duracion_dias = parent_span.derived_duration
  from parent_span
  where parent.id = parent_span.parent_id
    and parent.project_id = v_project_id
    and parent.obra_id = v_obra_id
    and parent.duracion_dias is distinct from parent_span.derived_duration;

  return v_task_id;
end;
$$;
