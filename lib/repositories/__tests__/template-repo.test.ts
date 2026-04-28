import { describe, expect, it, vi } from 'vitest'

import { TemplateRepo } from '@/lib/repositories/template-repo'
import type { ObraBootstrapTarea, TipoObra } from '@/types/gantt'

// ── Helpers ──────────────────────────────────────────────────────

function makeBootstrapTarea(overrides: Partial<ObraBootstrapTarea> = {}): ObraBootstrapTarea {
  return {
    id: overrides.id ?? 'tarea-1',
    nombre: overrides.nombre ?? 'Tarea test',
    duracionDias: overrides.duracionDias ?? 5,
    dependeDeId: overrides.dependeDeId ?? null,
    orden: overrides.orden ?? 1,
  }
}

/** Build a Supabase-like mock with controllable RPC behavior */
function buildSupabaseMock(options: {
  rpcData?: string | null
  rpcError?: { message: string } | null
  templateData?: unknown[]
  templateError?: { message: string } | null
  feriadosData?: unknown[]
  feriadosError?: { message: string } | null
} = {}) {
  const {
    rpcData = 'obra-new-id',
    rpcError = null,
    templateData = [],
    templateError = null,
    feriadosData = [],
    feriadosError = null,
  } = options

  const rpcFn = vi.fn().mockResolvedValue({ data: rpcData, error: rpcError })

  const supabase = {
    rpc: rpcFn,
    from: vi.fn((table: string) => {
      if (table === 'template_tareas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  returns: vi.fn().mockResolvedValue({
                    data: templateData,
                    error: templateError,
                  }),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'feriados') {
        return {
          select: vi.fn().mockResolvedValue({
            data: feriadosData,
            error: feriadosError,
          }),
        }
      }
      return {}
    }),
  }

  return { supabase, rpcFn }
}

// ── Tests ────────────────────────────────────────────────────────

describe('TemplateRepo — createObraFromTemplate RPC', () => {
  it('calls create_obra_with_tasks with correct payload and returns obra ID', async () => {
    const { supabase, rpcFn } = buildSupabaseMock({ rpcData: 'obra-abc-123' })
    const repo = new TemplateRepo(supabase as never)

    const tareas: ObraBootstrapTarea[] = [
      makeBootstrapTarea({ id: 't1', nombre: 'Preparación', duracionDias: 5, orden: 1 }),
      makeBootstrapTarea({ id: 't2', nombre: 'Estructura', duracionDias: 10, dependeDeId: 't1', orden: 2 }),
    ]

    const obraId = await repo.createObraFromTemplate({
      projectId: 'proj-1',
      nombre: 'Obra Norte',
      cliente: 'Cliente SA',
      tipoObra: 'SPLIT' as TipoObra,
      fechaInicioGlobal: '2026-04-06',
      vigenciaTexto: '2026-12-31',
      tareas,
    })

    expect(obraId).toBe('obra-abc-123')
    expect(rpcFn).toHaveBeenCalledWith('create_obra_with_tasks', {
      p_project_id: 'proj-1',
      p_nombre: 'Obra Norte',
      p_cliente: 'Cliente SA',
      p_tipo_obra: 'SPLIT',
      p_fecha_inicio_global: '2026-04-06',
      p_vigencia_texto: '2026-12-31',
      p_tareas: expect.arrayContaining([
        expect.objectContaining({
          id: 't1',
          nombre: 'Preparación',
          duracion_dias: 5,
          duracionDias: 5,
          depende_de_id: null,
          dependeDeId: null,
          orden: 1,
        }),
        expect.objectContaining({
          id: 't2',
          nombre: 'Estructura',
          duracion_dias: 10,
          depende_de_id: 't1',
          dependeDeId: 't1',
          orden: 2,
        }),
      ]),
    })
  })

  it('throws when RPC returns an error (simulates DB failure)', async () => {
    const { supabase } = buildSupabaseMock({
      rpcError: { message: 'unique_violation: duplicate key' },
    })
    const repo = new TemplateRepo(supabase as never)

    await expect(
      repo.createObraFromTemplate({
        projectId: 'proj-1',
        nombre: 'Obra',
        cliente: null,
        tipoObra: 'SPLIT' as TipoObra,
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
        tareas: [makeBootstrapTarea()],
      })
    ).rejects.toThrow('unique_violation: duplicate key')
  })

  it('throws when RPC returns null data (no obra ID)', async () => {
    const { supabase } = buildSupabaseMock({ rpcData: null })
    const repo = new TemplateRepo(supabase as never)

    await expect(
      repo.createObraFromTemplate({
        projectId: 'proj-1',
        nombre: 'Obra',
        cliente: null,
        tipoObra: 'SPLIT' as TipoObra,
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
        tareas: [makeBootstrapTarea()],
      })
    ).rejects.toThrow('RPC create_obra_with_tasks did not return a valid obra ID')
  })

  it('rejects tareas with invalid duration (0 or negative)', async () => {
    const { supabase } = buildSupabaseMock()
    const repo = new TemplateRepo(supabase as never)

    await expect(
      repo.createObraFromTemplate({
        projectId: 'proj-1',
        nombre: 'Obra',
        cliente: null,
        tipoObra: 'SPLIT' as TipoObra,
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
        tareas: [makeBootstrapTarea({ duracionDias: 0 })],
      })
    ).rejects.toThrow('INVALID_TEMPLATE_DURATION')
  })

  it('rejects tareas with NaN duration', async () => {
    const { supabase } = buildSupabaseMock()
    const repo = new TemplateRepo(supabase as never)

    await expect(
      repo.createObraFromTemplate({
        projectId: 'proj-1',
        nombre: 'Obra',
        cliente: null,
        tipoObra: 'SPLIT' as TipoObra,
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
        tareas: [makeBootstrapTarea({ duracionDias: NaN as unknown as number })],
      })
    ).rejects.toThrow('INVALID_TEMPLATE_DURATION')
  })

  it('does NOT call RPC when duration validation fails (pre-RPC gate)', async () => {
    const { supabase, rpcFn } = buildSupabaseMock()
    const repo = new TemplateRepo(supabase as never)

    try {
      await repo.createObraFromTemplate({
        projectId: 'proj-1',
        nombre: 'Obra',
        cliente: null,
        tipoObra: 'SPLIT' as TipoObra,
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
        tareas: [makeBootstrapTarea({ duracionDias: -1 })],
      })
    } catch {
      // expected
    }

    // RPC should never be called when validation fails — this is the atomicity gate
    expect(rpcFn).not.toHaveBeenCalled()
  })
})

describe('TemplateRepo — getActiveTemplate fallback', () => {
  it('returns project-specific template when it exists', async () => {
    const projectTasks = [
      {
        id: 'task-1',
        project_id: 'proj-real',
        tipo_obra: 'SPLIT',
        version: 1,
        status: 'published',
        nombre: 'Mi tarea',
        duracion_dias: 3,
        depende_de_template_id: null,
        orden: 1,
      },
    ]
    const { supabase } = buildSupabaseMock({ templateData: projectTasks })
    const repo = new TemplateRepo(supabase as never)

    const result = await repo.getActiveTemplate({
      projectId: 'proj-real' as never,
      tipoObra: 'SPLIT' as TipoObra,
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.nombre).toBe('Mi tarea')
    expect(result[0]?.projectId).toBe('proj-real')
  })

  it('falls back to sentinel when project template is empty', async () => {
    const sentinelTasks = [
      {
        id: 'sentinel-1',
        project_id: '00000000-0000-0000-0000-000000000000',
        tipo_obra: 'SPLIT',
        version: 1,
        status: 'published',
        nombre: 'Default task',
        duracion_dias: 5,
        depende_de_template_id: null,
        orden: 1,
      },
    ]

    // First call (project) returns empty, second call (sentinel) returns data
    let callCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'template_tareas') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    returns: vi.fn().mockImplementation(() => {
                      callCount += 1
                      if (callCount === 1) {
                        return Promise.resolve({ data: [], error: null })
                      }
                      return Promise.resolve({ data: sentinelTasks, error: null })
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const repo = new TemplateRepo(supabase as never)
    const result = await repo.getActiveTemplate({
      projectId: 'proj-without-template' as never,
      tipoObra: 'SPLIT' as TipoObra,
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.nombre).toBe('Default task')
  })

  it('returns empty array when neither project nor sentinel template exists', async () => {
    const { supabase } = buildSupabaseMock({ templateData: [] })
    const repo = new TemplateRepo(supabase as never)

    const result = await repo.getActiveTemplate({
      projectId: 'proj-empty' as never,
      tipoObra: 'Respaldo' as TipoObra,
    })

    expect(result).toEqual([])
  })

  it('throws when supabase returns a fetch error', async () => {
    const { supabase } = buildSupabaseMock({ templateError: { message: 'connection refused' } })
    const repo = new TemplateRepo(supabase as never)

    await expect(
      repo.getActiveTemplate({
        projectId: 'proj-1' as never,
        tipoObra: 'SPLIT' as TipoObra,
      })
    ).rejects.toThrow('connection refused')
  })
})
