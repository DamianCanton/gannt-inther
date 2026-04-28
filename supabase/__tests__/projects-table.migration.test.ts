import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260501_projects_catalog.sql'
)

describe('projects catalog migration', () => {
  it('creates projects table with id, nombre and timestamps', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('create table if not exists public.projects')
    expect(sql).toContain('id uuid primary key default gen_random_uuid()')
    expect(sql).toContain('nombre text not null')
    expect(sql).toContain('created_at timestamptz not null default now()')
    expect(sql).toContain('updated_at timestamptz not null default now()')
    expect(sql).toContain('create index if not exists idx_projects_nombre on public.projects(nombre)')
  })

  it('backfills project IDs from existing memberships and obras', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('insert into public.projects (id, nombre)')
    expect(sql).toContain("select distinct pm.project_id")
    expect(sql).toContain("select distinct o.project_id")
    expect(sql).toContain("'Proyecto ' || left(src.project_id::text, 8)")
    expect(sql).toContain('on conflict (id) do nothing')
  })

  it('adds FK from project_memberships.project_id to projects.id and enables read RLS', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('add constraint project_memberships_project_id_fkey')
    expect(sql).toContain('foreign key (project_id) references public.projects(id) on delete cascade')
    expect(sql).toContain('alter table public.projects enable row level security')
    expect(sql).toContain('create policy projects_select_by_membership on public.projects')
    expect(sql).toContain('create policy projects_insert_admin_only on public.projects')
    expect(sql).toContain('create policy projects_update_admin_only on public.projects')
  })
})
