import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260428170706_admin_obra_access.sql'
)

describe('admin obra access migration', () => {
  it('extends obra access helpers to allow admin visibility', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create or replace function public.can_access_obra_read(')
    expect(sql).toContain('public.current_user_is_admin()')
    expect(sql).toContain('create or replace function public.can_access_obra_write(')
  })
})
