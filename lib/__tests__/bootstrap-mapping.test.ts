import { beforeEach, describe, expect, it } from 'vitest'

import { remapTemplateToBootstrap } from '@/lib/bootstrap-mapping'
import type { TemplateTarea, Uuid } from '@/types/gantt'

function makeTemplateTarea(overrides: Partial<TemplateTarea> = {}): TemplateTarea {
  return {
    id: overrides.id ?? ('tmpl-' + Math.random().toString(36).slice(2)),
    projectId: overrides.projectId ?? '00000000-0000-0000-0000-000000000000',
    tipoObra: overrides.tipoObra ?? 'SPLIT',
    version: overrides.version ?? 1,
    status: overrides.status ?? 'published',
    nombre: overrides.nombre ?? 'Tarea',
    duracionDias: overrides.duracionDias ?? 5,
    dependeDeTemplateId: overrides.dependeDeTemplateId ?? null,
    orden: overrides.orden ?? 1,
  }
}

/** Deterministic ID generator for assertions */
let seq = 0
function sequentialId(): Uuid {
  seq += 1
  return `new-uuid-${seq}` as Uuid
}

describe('bootstrap-mapping — remapTemplateToBootstrap', () => {
  beforeEach(() => {
    seq = 0
  })

  it('assigns a unique new ID to every task', () => {
    const templates: TemplateTarea[] = [
      makeTemplateTarea({ id: 'tmpl-a', orden: 1 }),
      makeTemplateTarea({ id: 'tmpl-b', orden: 2 }),
      makeTemplateTarea({ id: 'tmpl-c', orden: 3 }),
    ]

    const result = remapTemplateToBootstrap(templates, sequentialId)

    expect(result).toHaveLength(3)
    const ids = result.map((t) => t.id)
    // All IDs must be unique
    expect(new Set(ids).size).toBe(3)
    // None of the original template IDs leak through
    expect(ids).not.toContain('tmpl-a')
    expect(ids).not.toContain('tmpl-b')
    expect(ids).not.toContain('tmpl-c')
  })

  it('remaps dependency references from template IDs to new IDs', () => {
    const templates: TemplateTarea[] = [
      makeTemplateTarea({ id: 'tmpl-a', dependeDeTemplateId: null, orden: 1 }),
      makeTemplateTarea({ id: 'tmpl-b', dependeDeTemplateId: 'tmpl-a', orden: 2 }),
      makeTemplateTarea({ id: 'tmpl-c', dependeDeTemplateId: 'tmpl-b', orden: 3 }),
    ]

    const result = remapTemplateToBootstrap(templates, sequentialId)

    // new-uuid-1 = tmpl-a, new-uuid-2 = tmpl-b, new-uuid-3 = tmpl-c
    expect(result[0]?.id).toBe('new-uuid-1')
    expect(result[0]?.dependeDeId).toBeNull()

    expect(result[1]?.id).toBe('new-uuid-2')
    expect(result[1]?.dependeDeId).toBe('new-uuid-1') // points to remapped tmpl-a

    expect(result[2]?.id).toBe('new-uuid-3')
    expect(result[2]?.dependeDeId).toBe('new-uuid-2') // points to remapped tmpl-b
  })

  it('preserves DAG topology through remapping', () => {
    // Diamond pattern: A → B, A → C, B → D, C → D
    const templates: TemplateTarea[] = [
      makeTemplateTarea({ id: 'A', dependeDeTemplateId: null, orden: 1, nombre: 'A' }),
      makeTemplateTarea({ id: 'B', dependeDeTemplateId: 'A', orden: 2, nombre: 'B' }),
      makeTemplateTarea({ id: 'C', dependeDeTemplateId: 'A', orden: 3, nombre: 'C' }),
      makeTemplateTarea({ id: 'D', dependeDeTemplateId: 'B', orden: 4, nombre: 'D' }),
    ]

    const result = remapTemplateToBootstrap(templates, sequentialId)

    const byName = new Map(result.map((t) => [t.nombre, t]))
    const a = byName.get('A')!
    const b = byName.get('B')!
    const c = byName.get('C')!
    const d = byName.get('D')!

    // A has no dependency
    expect(a.dependeDeId).toBeNull()
    // B and C both depend on A (same new ID)
    expect(b.dependeDeId).toBe(a.id)
    expect(c.dependeDeId).toBe(a.id)
    // D depends on B
    expect(d.dependeDeId).toBe(b.id)
  })

  it('preserves nombre, duracionDias, and orden from template', () => {
    const templates: TemplateTarea[] = [
      makeTemplateTarea({
        id: 'tmpl-x',
        nombre: 'Estructura principal',
        duracionDias: 12,
        orden: 5,
      }),
    ]

    const result = remapTemplateToBootstrap(templates, sequentialId)

    expect(result[0]?.nombre).toBe('Estructura principal')
    expect(result[0]?.duracionDias).toBe(12)
    expect(result[0]?.orden).toBe(5)
  })

  it('returns empty array for empty template list', () => {
    const result = remapTemplateToBootstrap([], sequentialId)
    expect(result).toEqual([])
  })

  it('handles single task with no dependencies', () => {
    const templates: TemplateTarea[] = [
      makeTemplateTarea({ id: 'solo', dependeDeTemplateId: null }),
    ]

    const result = remapTemplateToBootstrap(templates, sequentialId)

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('new-uuid-1')
    expect(result[0]?.dependeDeId).toBeNull()
  })

  it('generates different IDs when no custom generator is provided', () => {
    const templates: TemplateTarea[] = [
      makeTemplateTarea({ id: 'tmpl-a' }),
      makeTemplateTarea({ id: 'tmpl-b' }),
    ]

    const result = remapTemplateToBootstrap(templates)

    // Real crypto.randomUUID() — must be valid UUIDs and distinct
    expect(result[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(result[1]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(result[0]?.id).not.toBe(result[1]?.id)
  })

  it('never leaks original template IDs into the output dependeDeId', () => {
    const templates: TemplateTarea[] = [
      makeTemplateTarea({ id: 'secret-id-1', dependeDeTemplateId: null }),
      makeTemplateTarea({ id: 'secret-id-2', dependeDeTemplateId: 'secret-id-1' }),
    ]

    const result = remapTemplateToBootstrap(templates, sequentialId)

    for (const tarea of result) {
      expect(tarea.id).not.toBe('secret-id-1')
      expect(tarea.id).not.toBe('secret-id-2')
      expect(tarea.dependeDeId).not.toBe('secret-id-1')
      expect(tarea.dependeDeId).not.toBe('secret-id-2')
    }
  })
})
