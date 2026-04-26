import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260425_mutate_task_graph_hierarchy_sync.sql'
)

describe('smart insert RPC migration hierarchy persistence', () => {
  it('persists parent_id and offset_dias in create/update payload mapping', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain("v_parent_id := (payload->>'parent_id')::uuid;")
    expect(sql).toContain("v_offset_dias := coalesce((payload->>'offset_dias')::integer, 0);")
    expect(sql).toContain('parent_id,')
    expect(sql).toContain('offset_dias,')
    expect(sql).toContain('v_parent_id,')
    expect(sql).toContain('v_offset_dias,')
    expect(sql).toContain('parent_id = v_parent_id')
    expect(sql).toContain('offset_dias = v_offset_dias')
  })

  it('syncs parent duracion_dias from children span after mutations', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('max(child.offset_dias + child.duracion_dias)::integer as derived_duration')
    expect(sql).toContain('set duracion_dias = parent_span.derived_duration')
  })
})
