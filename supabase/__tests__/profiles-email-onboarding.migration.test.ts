import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260428171112_profiles_email_onboarding.sql'
)

describe('profiles email onboarding migration', () => {
  it('stores email in profiles and backfills existing users', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('add column if not exists email text not null default')
    expect(sql).toContain('create index if not exists idx_profiles_email on public.profiles(email)')
    expect(sql).toContain('update public.profiles p')
    expect(sql).toContain('insert into public.profiles (user_id, email, display_name)')
    expect(sql).toContain("coalesce(new.email, '')")
    expect(sql).toContain('drop policy if exists profiles_admin_read_all on public.profiles')
    expect(sql).toContain('using (public.current_user_is_admin())')
  })
})
