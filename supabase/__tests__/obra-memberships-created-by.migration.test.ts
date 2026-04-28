import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260430_obra_memberships_created_by.sql'
)

describe('obra_memberships created_by migration', () => {
  it('adds created_by column and index to obra_memberships', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('alter table public.obra_memberships')
    expect(sql).toContain('add column if not exists created_by uuid references public.profiles(user_id) on delete set null')
    expect(sql).toContain('create index if not exists idx_obra_memberships_created_by on public.obra_memberships(created_by)')
  })
})
