import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260429_usuarios_membresias_granulares.sql'
)

describe('usuarios membresías granulares migration', () => {
  it('creates obra_memberships with uniqueness and role constraints', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create table if not exists public.obra_memberships')
    expect(sql).toContain('id uuid primary key default gen_random_uuid()')
    expect(sql).toContain('user_id uuid not null references public.profiles(user_id) on delete cascade')
    expect(sql).toContain('obra_id uuid not null references public.obras(id) on delete cascade')
    expect(sql).toContain("role text not null check (role in ('viewer', 'editor'))")
    expect(sql).toContain('constraint obra_memberships_unique_user_obra unique (user_id, obra_id)')
    expect(sql).toContain('create index if not exists idx_obra_memberships_user_id on public.obra_memberships(user_id)')
    expect(sql).toContain('create index if not exists idx_obra_memberships_obra_id on public.obra_memberships(obra_id)')
  })

  it('adds profiles is_active and global_role plus admin write policies', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('alter table public.profiles')
    expect(sql).toContain('add column if not exists is_active boolean not null default true')
    expect(sql).toContain("add column if not exists global_role text not null default 'member'")
    expect(sql).toContain("check (global_role in ('member', 'admin'))")
    expect(sql).toContain('create policy profiles_admin_insert on public.profiles')
    expect(sql).toContain('create policy profiles_admin_update on public.profiles')
  })

  it('replaces obras/tareas/dependencias RLS using centralized project/obra access checks', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create or replace function public.current_user_is_active()')
    expect(sql).toContain('create or replace function public.can_access_obra_read(')
    expect(sql).toContain('create or replace function public.can_access_obra_write(')
    expect(sql).toContain('create policy obras_select_by_membership on public.obras')
    expect(sql).toContain('create policy tareas_update_by_membership on public.tareas')
    expect(sql).toContain('create policy dependencias_insert_by_membership on public.dependencias')
  })

  it('adds RLS on obra_memberships for admin and own-row reads', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('alter table public.obra_memberships enable row level security')
    expect(sql).toContain('create policy obra_memberships_select_admin_or_self on public.obra_memberships')
    expect(sql).toContain('create policy obra_memberships_insert_admin_only on public.obra_memberships')
    expect(sql).toContain('create policy obra_memberships_update_admin_only on public.obra_memberships')
    expect(sql).toContain('create policy obra_memberships_delete_admin_only on public.obra_memberships')
  })

  it('keeps helper predicates aligned with index-backed access paths', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('from public.project_memberships pm')
    expect(sql).toContain('where pm.user_id = auth.uid()')
    expect(sql).toContain('and pm.project_id = target_project_id')

    expect(sql).toContain('from public.obra_memberships om')
    expect(sql).toContain('where om.user_id = auth.uid()')
    expect(sql).toContain('and om.obra_id = target_obra_id')
    expect(sql).toContain("and om.role = 'editor'")

    expect(sql).toContain('public.has_project_membership(target_project_id)')
    expect(sql).toContain('or exists (')
  })
})
