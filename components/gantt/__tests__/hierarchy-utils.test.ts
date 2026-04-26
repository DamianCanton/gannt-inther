import { describe, expect, it } from 'vitest'

import type { ScheduleTask } from '@/types/gantt'

import { flattenHierarchyForInteractive, getHierarchyParentIds } from '../hierarchy-utils'

function makeTask(overrides: Partial<ScheduleTask>): ScheduleTask {
  return {
    id: overrides.id ?? 'task',
    projectId: overrides.projectId ?? 'p1',
    obraId: overrides.obraId ?? 'o1',
    nombre: overrides.nombre ?? 'Task',
    duracionDias: overrides.duracionDias ?? 1,
    dependeDeId: overrides.dependeDeId ?? null,
    parentId: overrides.parentId ?? null,
    offsetDias: overrides.offsetDias ?? 0,
    orden: overrides.orden ?? 1,
    fechaInicio: overrides.fechaInicio ?? '2026-04-06',
    fechaFin: overrides.fechaFin ?? '2026-04-06',
  }
}

describe('hierarchy-utils', () => {
  it('flattens parent/child rows with depth and visibility', () => {
    const tasks: ScheduleTask[] = [
      makeTask({ id: 'P1', nombre: 'Parent', orden: 1 }),
      makeTask({ id: 'C1', nombre: 'Child', parentId: 'P1', offsetDias: 2, orden: 2 }),
      makeTask({ id: 'P2', nombre: 'Sibling', orden: 3 }),
    ]

    const rows = flattenHierarchyForInteractive(tasks, new Set())

    expect(rows.map((row) => row.task.id)).toEqual(['P1', 'C1', 'P2'])
    expect(rows.find((row) => row.task.id === 'P1')).toMatchObject({
      depth: 0,
      hasChildren: true,
      isCollapsed: false,
    })
    expect(rows.find((row) => row.task.id === 'C1')).toMatchObject({
      depth: 1,
      hasChildren: false,
    })
  })

  it('hides children when parent is collapsed', () => {
    const tasks: ScheduleTask[] = [
      makeTask({ id: 'P1', orden: 1 }),
      makeTask({ id: 'C1', parentId: 'P1', orden: 2 }),
      makeTask({ id: 'P2', orden: 3 }),
    ]

    const rows = flattenHierarchyForInteractive(tasks, new Set(['P1']))

    expect(rows.map((row) => row.task.id)).toEqual(['P1', 'P2'])
    expect(rows[0]).toMatchObject({ hasChildren: true, isCollapsed: true })
  })

  it('keeps flat behavior for tasks without parent/children', () => {
    const tasks: ScheduleTask[] = [
      makeTask({ id: 'A', parentId: null, orden: 1 }),
      makeTask({ id: 'B', parentId: null, orden: 2 }),
    ]

    const rows = flattenHierarchyForInteractive(tasks, new Set(['A']))

    expect(rows.map((row) => row.task.id)).toEqual(['A', 'B'])
    expect(rows.every((row) => row.depth === 0)).toBe(true)
    expect(getHierarchyParentIds(tasks)).toEqual(new Set())
  })
})
