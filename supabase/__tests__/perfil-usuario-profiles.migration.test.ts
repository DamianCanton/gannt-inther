import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260428_perfil_usuario_profiles.sql'
)

describe('perfil usuario profiles migration', () => {
  it('creates profiles table with updated_at trigger', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create table if not exists public.profiles')
    expect(sql).toContain('user_id uuid primary key references auth.users(id) on delete cascade')
    expect(sql).toContain('display_name text not null default')
    expect(sql).toContain('created_at timestamptz not null default now()')
    expect(sql).toContain('updated_at timestamptz not null default now()')
    expect(sql).toContain('create trigger trg_profiles_updated_at')
    expect(sql).toContain('before update on public.profiles')
    expect(sql).toContain('execute function public.set_updated_at()')
  })

  it('adds trigger-based provisioning and backfill for existing auth users', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create or replace function public.handle_new_user_profile()')
    expect(sql).toContain('security definer')
    expect(sql).toContain('after insert on auth.users')
    expect(sql).toContain('create trigger on_auth_user_created_profile')
    expect(sql).toContain('insert into public.profiles (user_id, display_name)')
    expect(sql).toContain('insert into public.profiles (user_id, display_name)')
    expect(sql).toContain('from auth.users u')
    expect(sql).toContain('where p.user_id is null')
  })

  it('enables RLS with owner update and admin read-all policies', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('alter table public.profiles enable row level security')
    expect(sql).toContain('create policy profiles_select_own on public.profiles')
    expect(sql).toContain('using (auth.uid() = user_id)')
    expect(sql).toContain('create policy profiles_update_own on public.profiles')
    expect(sql).toContain('with check (auth.uid() = user_id)')
    expect(sql).toContain('create policy profiles_admin_read_all on public.profiles')
    expect(sql).toContain("pm.role = 'admin'")
  })
})
