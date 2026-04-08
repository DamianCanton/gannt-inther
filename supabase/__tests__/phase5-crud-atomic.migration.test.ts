import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260406_phase5_crud_atomic.sql'
)

describe('phase 5 atomic CRUD migration', () => {
  it('creates mutate_task_graph RPC with transactional create/update/delete intents', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create or replace function public.mutate_task_graph(')
    expect(sql).toContain("v_intent not in ('create', 'update', 'delete')")
    expect(sql).toContain("if v_intent = 'create' then")
    expect(sql).toContain("if v_intent = 'update' then")
    expect(sql).toContain('-- delete intent')
  })

  it('enforces invariant groundwork: unique mirror row, scoped dependency checks, self/cycle rejection', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create unique index if not exists ux_dependencias_tarea_id')
    expect(sql).toContain('and dep.obra_id = v_obra_id')
    expect(sql).toContain('and dep.project_id = v_project_id')
    expect(sql).toContain("raise exception 'VALIDATION_ERROR:SELF_DEPENDENCY'")
    expect(sql).toContain('with recursive predecessor_chain as (')
    expect(sql).toContain("raise exception 'DEPENDENCY_CYCLE'")
  })

  it('implements delete edge cleanup and deterministic orden renormalization', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('d.tarea_id = v_task_id or d.depende_de_id = v_task_id')
    expect(sql).toContain('set depende_de_id = null')
    expect(sql).toContain('row_number() over (order by t.orden, t.id)::integer as normalized_orden')
    expect(sql).toContain('set orden = o.normalized_orden')
  })
})
