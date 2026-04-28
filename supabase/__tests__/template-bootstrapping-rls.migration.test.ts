import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const baseMigrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260410_templates_bootstrapping.sql'
)

const sentinelFixPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260413_template_tareas_select_sentinel_fix.sql'
)

describe('RLS evidence: sentinel templates are read-only', () => {
  // ── Base migration (original policies) ─────────────────────────

  it('base migration enables RLS on template_tareas', async () => {
    const sql = await readFile(baseMigrationPath, 'utf8')
    expect(sql).toContain('alter table public.template_tareas enable row level security')
  })

  it('base migration has SELECT, INSERT, UPDATE, DELETE policies', async () => {
    const sql = await readFile(baseMigrationPath, 'utf8')

    expect(sql).toContain('create policy template_tareas_select_by_project')
    expect(sql).toContain('create policy template_tareas_insert_by_project')
    expect(sql).toContain('create policy template_tareas_update_by_project')
    expect(sql).toContain('create policy template_tareas_delete_by_project')
  })

  it('base INSERT/UPDATE/DELETE policies restrict to project_memberships (no sentinel bypass)', async () => {
    const sql = await readFile(baseMigrationPath, 'utf8')

    // Helper: extract a single policy block (from its CREATE to the next semicolon)
    function extractPolicy(source: string, policyName: string): string {
      const start = source.indexOf(`create policy ${policyName}`)
      const end = source.indexOf(';', start)
      return source.slice(start, end)
    }

    // INSERT policy must check project_memberships
    const insertPolicy = extractPolicy(sql, 'template_tareas_insert_by_project')
    expect(insertPolicy).toContain('project_id in (')
    expect(insertPolicy).toContain('project_memberships')
    // INSERT policy should NOT have sentinel bypass
    expect(insertPolicy).not.toContain('00000000-0000-0000-0000-000000000000')

    // UPDATE policy
    const updatePolicy = extractPolicy(sql, 'template_tareas_update_by_project')
    expect(updatePolicy).toContain('project_memberships')
    expect(updatePolicy).not.toContain('00000000-0000-0000-0000-000000000000')

    // DELETE policy
    const deletePolicy = extractPolicy(sql, 'template_tareas_delete_by_project')
    expect(deletePolicy).toContain('project_memberships')
    expect(deletePolicy).not.toContain('00000000-0000-0000-0000-000000000000')
  })

  it('base migration seeds sentinel templates with project_id = zero UUID', async () => {
    const sql = await readFile(baseMigrationPath, 'utf8')

    expect(sql).toContain("'00000000-0000-0000-0000-000000000000'")
    expect(sql).toContain("v_project_id uuid := '00000000-0000-0000-0000-000000000000'")

    // Verify all three types are seeded
    expect(sql).toContain("'SPLIT'")
    expect(sql).toContain("'OTM'")
    expect(sql).toContain("'Respaldo'")
  })

  // ── Sentinel fix migration (SELECT policy update) ──────────────

  it('sentinel fix adds read-only access for sentinel rows in SELECT policy', async () => {
    const sql = await readFile(sentinelFixPath, 'utf8')

    // Must drop old policy first (idempotent)
    expect(sql).toContain('drop policy if exists template_tareas_select_by_project')

    // Must contain sentinel UUID in the OR clause
    expect(sql).toContain("or project_id = '00000000-0000-0000-0000-000000000000'::uuid")

    // Must still check project_memberships for regular rows
    expect(sql).toContain('project_memberships')
  })

  it('sentinel fix does NOT modify INSERT/UPDATE/DELETE policies (write isolation preserved)', async () => {
    const sql = await readFile(sentinelFixPath, 'utf8')

    // The fix file should not touch write policies
    expect(sql).not.toContain('create policy template_tareas_insert')
    expect(sql).not.toContain('create policy template_tareas_update')
    expect(sql).not.toContain('create policy template_tareas_delete')
    expect(sql).not.toContain('drop policy if exists template_tareas_insert')
    expect(sql).not.toContain('drop policy if exists template_tareas_update')
    expect(sql).not.toContain('drop policy if exists template_tareas_delete')
  })

  // ── Cross-validation: write policies in base never include sentinel bypass ──

  it('combined evidence: sentinel rows are SELECT-able but never INSERT/UPDATE/DELETE-able by normal users', async () => {
    const baseSql = await readFile(baseMigrationPath, 'utf8')
    const fixSql = await readFile(sentinelFixPath, 'utf8')

    // SELECT: after fix, includes sentinel bypass
    const selectPolicy = fixSql
    expect(selectPolicy).toContain('00000000-0000-0000-0000-000000000000')

    // INSERT: only through project_memberships, never sentinel
    const insertStart = baseSql.indexOf('create policy template_tareas_insert_by_project')
    const insertEnd = baseSql.indexOf(';', insertStart)
    const insertPolicy = baseSql.slice(insertStart, insertEnd)
    expect(insertPolicy).not.toContain('00000000-0000-0000-0000-000000000000')
    expect(insertPolicy).toContain('project_memberships')

    // UPDATE: only through project_memberships, never sentinel
    const updateStart = baseSql.indexOf('create policy template_tareas_update_by_project')
    const updateEnd = baseSql.indexOf(';', updateStart)
    const updatePolicy = baseSql.slice(updateStart, updateEnd)
    expect(updatePolicy).not.toContain('00000000-0000-0000-0000-000000000000')
    expect(updatePolicy).toContain('project_memberships')

    // DELETE: only through project_memberships, never sentinel
    const deleteStart = baseSql.indexOf('create policy template_tareas_delete_by_project')
    const deleteEnd = baseSql.indexOf(';', deleteStart)
    const deletePolicy = baseSql.slice(deleteStart, deleteEnd)
    expect(deletePolicy).not.toContain('00000000-0000-0000-0000-000000000000')
    expect(deletePolicy).toContain('project_memberships')
  })
})
