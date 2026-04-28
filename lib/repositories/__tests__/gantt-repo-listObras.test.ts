import { describe, expect, it, vi } from 'vitest'

import { GanttRepo } from '@/lib/repositories/gantt-repo'

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Mock simplificado: la nueva implementación de listObras hace UNA sola query
 * con JOIN anidado (tareas(count)), no dos queries separadas.
 */
function buildListObrasSupabaseMock(options: {
  data?: unknown[]
  error?: { message: string } | null
} = {}) {
  const { data = [], error = null } = options

  // Cadena: from('obras') → select('...') → eq('project_id', ...) → order('created_at', ...)
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  const supabase = { from: fromMock }

  return { supabase, fromMock, selectMock, eqMock, orderMock }
}

// ── Tests ────────────────────────────────────────────────────────

describe('GanttRepo — listObras', () => {
  it('returns obras with taskCount from nested tareas(count)', async () => {
    const data = [
      {
        id: 'obra-1',
        project_id: 'proj-1',
        nombre: 'Obra Norte',
        cliente: 'Cliente SA',
        tipo_obra: 'SPLIT',
        fecha_inicio_global: '2026-04-06',
        vigencia_texto: '2026-12-31',
        tareas: [{ count: 3 }],
      },
      {
        id: 'obra-2',
        project_id: 'proj-1',
        nombre: 'Obra Sur',
        cliente: null,
        tipo_obra: 'OTM',
        fecha_inicio_global: '2026-05-01',
        vigencia_texto: null,
        tareas: [{ count: 1 }],
      },
    ]

    const { supabase } = buildListObrasSupabaseMock({ data })
    const repo = new GanttRepo(supabase as never)

    const result = await repo.listObras('proj-1')

    expect(result).toHaveLength(2)

    expect(result[0]).toEqual({
      id: 'obra-1',
      projectId: 'proj-1',
      nombre: 'Obra Norte',
      cliente: 'Cliente SA',
      tipoObra: 'SPLIT',
      fechaInicioGlobal: '2026-04-06',
      vigenciaTexto: '2026-12-31',
      taskCount: 3,
    })

    expect(result[1]).toEqual({
      id: 'obra-2',
      projectId: 'proj-1',
      nombre: 'Obra Sur',
      cliente: null,
      tipoObra: 'OTM',
      fechaInicioGlobal: '2026-05-01',
      vigenciaTexto: null,
      taskCount: 1,
    })
  })

  it('returns empty array when no obras exist for the project', async () => {
    const { supabase } = buildListObrasSupabaseMock({ data: [] })
    const repo = new GanttRepo(supabase as never)

    const result = await repo.listObras('proj-empty')

    expect(result).toEqual([])
  })

  it('returns obra with taskCount 0 when obra has no tareas (empty array)', async () => {
    const data = [
      {
        id: 'obra-new',
        project_id: 'proj-1',
        nombre: 'Obra Vacía',
        cliente: 'Cliente X',
        tipo_obra: 'Respaldo',
        fecha_inicio_global: '2026-06-01',
        vigencia_texto: null,
        tareas: [],
      },
    ]

    const { supabase } = buildListObrasSupabaseMock({ data })
    const repo = new GanttRepo(supabase as never)

    const result = await repo.listObras('proj-1')

    expect(result).toHaveLength(1)
    expect(result[0]?.taskCount).toBe(0)
  })

  it('returns taskCount 0 when tareas property is missing', async () => {
    const data = [
      {
        id: 'obra-no-prop',
        project_id: 'proj-1',
        nombre: 'Obra Sin Prop',
        cliente: null,
        tipo_obra: 'SPLIT',
        fecha_inicio_global: '2026-04-01',
        vigencia_texto: null,
        // tareas property missing entirely
      },
    ]

    const { supabase } = buildListObrasSupabaseMock({ data })
    const repo = new GanttRepo(supabase as never)

    const result = await repo.listObras('proj-1')

    expect(result[0]?.taskCount).toBe(0)
  })

  it('filters taskCount per obra — does not leak counts across obras', async () => {
    const data = [
      {
        id: 'obra-a',
        project_id: 'proj-1',
        nombre: 'Obra A',
        cliente: null,
        tipo_obra: 'SPLIT',
        fecha_inicio_global: '2026-04-01',
        vigencia_texto: null,
        tareas: [{ count: 5 }],
      },
      {
        id: 'obra-b',
        project_id: 'proj-1',
        nombre: 'Obra B',
        cliente: null,
        tipo_obra: 'SPLIT',
        fecha_inicio_global: '2026-04-01',
        vigencia_texto: null,
        tareas: [{ count: 0 }],
      },
      {
        id: 'obra-c',
        project_id: 'proj-1',
        nombre: 'Obra C',
        cliente: null,
        tipo_obra: 'SPLIT',
        fecha_inicio_global: '2026-04-01',
        vigencia_texto: null,
        tareas: [{ count: 2 }],
      },
    ]

    const { supabase } = buildListObrasSupabaseMock({ data })
    const repo = new GanttRepo(supabase as never)

    const result = await repo.listObras('proj-1')

    expect(result.find((o) => o.id === 'obra-a')?.taskCount).toBe(5)
    expect(result.find((o) => o.id === 'obra-b')?.taskCount).toBe(0)
    expect(result.find((o) => o.id === 'obra-c')?.taskCount).toBe(2)
  })

  it('throws when the query returns an error', async () => {
    const { supabase } = buildListObrasSupabaseMock({
      error: { message: 'connection refused' },
    })
    const repo = new GanttRepo(supabase as never)

    await expect(repo.listObras('proj-1')).rejects.toThrow('connection refused')
  })

  it('queries obras table with correct project_id filter and JOIN select', async () => {
    const { supabase, selectMock, eqMock } = buildListObrasSupabaseMock({
      data: [],
    })
    const repo = new GanttRepo(supabase as never)

    await repo.listObras('my-project-123')

    // Verifica que se usa el JOIN con tareas(count)
    expect(selectMock).toHaveBeenCalledWith(
      'id, project_id, nombre, cliente, tipo_obra, fecha_inicio_global, vigencia_texto, tareas(count)'
    )
    expect(eqMock).toHaveBeenCalledWith('project_id', 'my-project-123')
  })
})
