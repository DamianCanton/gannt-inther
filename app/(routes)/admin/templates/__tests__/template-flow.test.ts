import { describe, expect, it, vi } from 'vitest'

import { TemplateRepo } from '@/lib/repositories/template-repo'
import { remapTemplateToBootstrap } from '@/lib/bootstrap-mapping'
import { validateTemplateTasks } from '@/lib/template-validation'
import type { ObraBootstrapTarea, TemplateTarea, TipoObra, Uuid } from '@/types/gantt'

/**
 * Integration-lite: Full flow from Template → Create Obra
 *
 * Simulates the end-to-end pipeline:
 * 1. Save a template (saveActiveTemplate)
 * 2. Load it back (getActiveTemplate)
 * 3. Validate DAG invariants
 * 4. Remap UUIDs for new obra
 * 5. Call RPC to create obra atomically
 *
 * All Supabase calls are mocked; we verify the data transformation pipeline.
 */

// ── Helpers ──────────────────────────────────────────────────────

type StoredRow = {
  id: string
  project_id: string
  tipo_obra: string
  version: number
  status: string
  nombre: string
  duracion_dias: number
  depende_de_template_id: string | null
  orden: number
}

/**
 * Build an in-memory Supabase mock that stores template_tareas rows.
 * This lets saveActiveTemplate + getActiveTemplate operate on the same store.
 */
function buildInMemorySupabase() {
  const store: StoredRow[] = []
  let obraIdCounter = 0

  const supabase = {
    rpc: vi.fn((_name: string, _params: Record<string, unknown>) => {
      obraIdCounter += 1
      return Promise.resolve({ data: `obra-${obraIdCounter}`, error: null })
    }),
    from: vi.fn((table: string) => {
      if (table === 'template_tareas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  returns: vi.fn().mockImplementation(() => {
                    // Return a copy of matching rows
                    return Promise.resolve({ data: [...store], error: null })
                  }),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                // Clear matching rows from store
                store.length = 0
                return Promise.resolve({ error: null })
              }),
            }),
          }),
          insert: vi.fn().mockImplementation((rows: StoredRow[]) => {
            store.push(...rows)
            return Promise.resolve({ error: null })
          }),
        }
      }
      if (table === 'feriados') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {}
    }),
  }

  return { supabase, store }
}

// ── Tests ────────────────────────────────────────────────────────

describe('E2E-lite: Template → Obra bootstrap flow', () => {
  it('saves a template, loads it, validates, remaps UUIDs, and creates obra', async () => {
    const { supabase, store } = buildInMemorySupabase()
    const repo = new TemplateRepo(supabase as never)
    const projectId = 'proj-flow-1' as Uuid
    const tipoObra = 'SPLIT' as TipoObra

    // ── Step 1: Save template (linear chain: A1 → A2 → A3) ─────
    await repo.saveActiveTemplate({
      projectId,
      tipoObra,
      tasks: [
        { nombre: 'Preparación', duracionDias: 5, dependeDeTemplateId: null, orden: 1 },
        { nombre: 'Estructura', duracionDias: 10, dependeDeTemplateId: null, orden: 2 },
        { nombre: 'Acabados', duracionDias: 7, dependeDeTemplateId: null, orden: 3 },
      ],
    })

    // Verify: store has 3 rows with correct metadata
    expect(store).toHaveLength(3)
    expect(store.every((r) => r.project_id === projectId)).toBe(true)
    expect(store.every((r) => r.tipo_obra === tipoObra)).toBe(true)
    expect(store.every((r) => r.status === 'published')).toBe(true)

    // ── Step 2: Load template (returns the 3 saved rows) ───────
    const loaded = await repo.getActiveTemplate({ projectId, tipoObra })

    expect(loaded).toHaveLength(3)
    expect(loaded.map((t) => t.nombre)).toEqual(['Preparación', 'Estructura', 'Acabados'])
    // No dependencies set (all null)
    expect(loaded.every((t) => t.dependeDeTemplateId === null)).toBe(true)

    // ── Step 3: Validate DAG invariants (no deps = trivially valid) ─
    expect(() => validateTemplateTasks(loaded)).not.toThrow()

    // ── Step 4: Remap UUIDs ──────────────────────────────────────
    const bootstrapTareas = remapTemplateToBootstrap(loaded)

    expect(bootstrapTareas).toHaveLength(3)
    // All new IDs are different from template IDs
    for (const bt of bootstrapTareas) {
      expect(loaded.some((t) => t.id === bt.id)).toBe(false)
    }
    // Properties preserved
    expect(bootstrapTareas.map((t) => t.nombre)).toEqual([
      'Preparación',
      'Estructura',
      'Acabados',
    ])
    expect(bootstrapTareas.map((t) => t.duracionDias)).toEqual([5, 10, 7])

    // ── Step 5: Create obra via RPC ──────────────────────────────
    const obraId = await repo.createObraFromTemplate({
      projectId,
      nombre: 'Obra Test Flow',
      cliente: 'Cliente X',
      tipoObra,
      fechaInicioGlobal: '2026-04-13',
      vigenciaTexto: '2026-12-31',
      tareas: bootstrapTareas,
    })

    expect(obraId).toBe('obra-1')
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_obra_with_tasks',
      expect.objectContaining({
        p_project_id: projectId,
        p_nombre: 'Obra Test Flow',
        p_tipo_obra: tipoObra,
        p_tareas: expect.arrayContaining([
          expect.objectContaining({ orden: 1 }),
          expect.objectContaining({ orden: 2 }),
          expect.objectContaining({ orden: 3 }),
        ]),
      })
    )
  })

  it('falls back to sentinel when project has no template, then creates obra', async () => {
    // Sentinel store holds default OTM tasks with dependency chain
    const sentinelRows: StoredRow[] = [
      {
        id: 'sent-b1',
        project_id: '00000000-0000-0000-0000-000000000000',
        tipo_obra: 'OTM',
        version: 1,
        status: 'published',
        nombre: 'Excavación',
        duracion_dias: 7,
        depende_de_template_id: null,
        orden: 1,
      },
      {
        id: 'sent-b2',
        project_id: '00000000-0000-0000-0000-000000000000',
        tipo_obra: 'OTM',
        version: 1,
        status: 'published',
        nombre: 'Estructura metálica',
        duracion_dias: 12,
        depende_de_template_id: 'sent-b1',
        orden: 2,
      },
    ]

    let fetchCount = 0
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: 'obra-sentinel', error: null }),
      from: vi.fn((table: string) => {
        if (table === 'template_tareas') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    returns: vi.fn().mockImplementation(() => {
                      fetchCount += 1
                      // First fetch (project) returns empty; second (sentinel) returns data
                      if (fetchCount === 1) {
                        return Promise.resolve({ data: [], error: null })
                      }
                      return Promise.resolve({ data: sentinelRows, error: null })
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'feriados') {
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
        }
        return {}
      }),
    }

    const repo = new TemplateRepo(supabase as never)

    // Load from sentinel fallback
    const loaded = await repo.getActiveTemplate({
      projectId: 'proj-new' as Uuid,
      tipoObra: 'OTM' as TipoObra,
    })

    expect(loaded).toHaveLength(2)
    expect(loaded[0]?.nombre).toBe('Excavación')
    expect(loaded[1]?.nombre).toBe('Estructura metálica')

    // Validate + remap + create
    validateTemplateTasks(loaded)
    const bootstrapTareas = remapTemplateToBootstrap(loaded)

    const obraId = await repo.createObraFromTemplate({
      projectId: 'proj-new' as Uuid,
      nombre: 'Obra from Sentinel',
      cliente: null,
      tipoObra: 'OTM' as TipoObra,
      fechaInicioGlobal: '2026-05-01',
      vigenciaTexto: null,
      tareas: bootstrapTareas,
    })

    expect(obraId).toBe('obra-sentinel')
    // Dependency preserved through remapping
    expect(bootstrapTareas[1]?.dependeDeId).toBe(bootstrapTareas[0]?.id)
  })

  it('validation rejects cyclic template before RPC is ever called', async () => {
    const cyclicTasks: Pick<TemplateTarea, 'id' | 'nombre' | 'duracionDias' | 'dependeDeTemplateId' | 'orden'>[] = [
      { id: 'x1', nombre: 'A', duracionDias: 5, dependeDeTemplateId: 'x2', orden: 1 },
      { id: 'x2', nombre: 'B', duracionDias: 3, dependeDeTemplateId: 'x1', orden: 2 },
    ]

    expect(() => validateTemplateTasks(cyclicTasks)).toThrow(/circular|CYCLE/i)
  })

  it('validation rejects self-dependency', async () => {
    const selfDepTasks: Pick<TemplateTarea, 'id' | 'nombre' | 'duracionDias' | 'dependeDeTemplateId' | 'orden'>[] = [
      { id: 's1', nombre: 'Lonely', duracionDias: 5, dependeDeTemplateId: 's1', orden: 1 },
    ]

    expect(() => validateTemplateTasks(selfDepTasks)).toThrow(/sí misma|SELF/i)
  })

  it('validation rejects zero duration', async () => {
    const badDuration: Pick<TemplateTarea, 'id' | 'nombre' | 'duracionDias' | 'dependeDeTemplateId' | 'orden'>[] = [
      { id: 'd1', nombre: 'Ghost', duracionDias: 0, dependeDeTemplateId: null, orden: 1 },
    ]

    expect(() => validateTemplateTasks(badDuration)).toThrow(/duración|INVALID_DURATION/i)
  })
})
