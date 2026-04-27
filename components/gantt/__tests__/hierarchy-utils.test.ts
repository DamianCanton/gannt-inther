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
    orden: overrides.orden ?? 1,
    fechaInicio: overrides.fechaInicio ?? '2026-04-06',
    fechaFin: overrides.fechaFin ?? '2026-04-06',
  }
}

describe('hierarchy-utils', () => {
  it('returns flat rows sorted for interactive rendering', () => {
    const tasks: ScheduleTask[] = [
      makeTask({ id: 'B', nombre: 'Segundo', orden: 2, fechaInicio: '2026-04-07', fechaFin: '2026-04-07' }),
      makeTask({ id: 'A', nombre: 'Primero', orden: 1, fechaInicio: '2026-04-06', fechaFin: '2026-04-06' }),
    ]

    const rows = flattenHierarchyForInteractive(tasks, new Set())

    expect(rows.map((row) => row.task.id)).toEqual(['A', 'B'])
    expect(rows[0]).toMatchObject({
      depth: 0,
      hasChildren: false,
      isCollapsed: false,
    })
    expect(rows[1]).toMatchObject({ depth: 0, hasChildren: false, isCollapsed: false })
  })

  it('ignores collapsed parent ids in flat mode', () => {
    const tasks: ScheduleTask[] = [
      makeTask({ id: 'A', orden: 1 }),
      makeTask({ id: 'B', orden: 2 }),
    ]

    const rows = flattenHierarchyForInteractive(tasks, new Set(['A']))

    expect(rows.map((row) => row.task.id)).toEqual(['A', 'B'])
    expect(rows.every((row) => row.isCollapsed === false)).toBe(true)
  })

  it('returns empty parent id set in flat mode', () => {
    const tasks: ScheduleTask[] = [
      makeTask({ id: 'A', orden: 1 }),
      makeTask({ id: 'B', orden: 2 }),
    ]

    expect(getHierarchyParentIds(tasks)).toEqual(new Set())
  })
})
