import { describe, expect, it } from 'vitest'

import {
  buildGraph,
  detectCycle,
  recalculateCascade,
  recalculateCascadeWithDetails,
  topologicalSort,
} from '@/lib/gantt-dag'
import type { RecalculateParams, TaskDependency, TaskInput } from '@/types/gantt'

const makeTask = (overrides: Partial<TaskInput>): TaskInput => ({
  id: overrides.id ?? 'task',
  projectId: overrides.projectId ?? 'p1',
  obraId: overrides.obraId ?? 'o1',
  nombre: overrides.nombre ?? 'Task',
  duracionDias: overrides.duracionDias ?? 1,
  dependeDeId: overrides.dependeDeId ?? null,
  orden: overrides.orden ?? 1,
})

const baseTasks: TaskInput[] = [
  makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
  makeTask({ id: 'B', nombre: 'B', duracionDias: 2, dependeDeId: 'A', orden: 2 }),
  makeTask({ id: 'C', nombre: 'C', duracionDias: 1, dependeDeId: 'B', orden: 3 }),
]

describe('gantt-dag', () => {
  it('builds graph with adjacency and in-degree from legacy links', () => {
    const graph = buildGraph(baseTasks)

    expect(graph.adjacency.get('A')).toEqual(['B'])
    expect(graph.adjacency.get('B')).toEqual(['C'])
    expect(graph.inDegree.get('A')).toBe(0)
    expect(graph.inDegree.get('C')).toBe(1)
  })

  it('sorts tasks topologically with deterministic order by orden for disconnected roots', () => {
    const disconnected: TaskInput[] = [
      makeTask({ id: 'R2', nombre: 'R2', orden: 2, dependeDeId: null }),
      makeTask({ id: 'R1', nombre: 'R1', orden: 1, dependeDeId: null }),
      makeTask({ id: 'R3', nombre: 'R3', orden: 3, dependeDeId: null }),
    ]

    const first = topologicalSort(disconnected).map((task) => task.id)
    const second = topologicalSort(disconnected).map((task) => task.id)

    expect(first).toEqual(['R1', 'R2', 'R3'])
    expect(second).toEqual(['R1', 'R2', 'R3'])
  })

  it('detects direct cycle A <-> B', () => {
    const tasks: TaskInput[] = [
      makeTask({ id: 'A', dependeDeId: 'B', orden: 1 }),
      makeTask({ id: 'B', dependeDeId: 'A', orden: 2 }),
    ]

    const cycle = detectCycle(tasks)

    expect(new Set(cycle)).toEqual(new Set(['A', 'B']))
  })

  it('detects three-node cycle A -> B -> C -> A', () => {
    const cyclicTasks: TaskInput[] = [
      makeTask({ id: 'A', dependeDeId: 'C', orden: 1 }),
      makeTask({ id: 'B', dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'C', dependeDeId: 'B', orden: 3 }),
    ]

    const cycle = detectCycle(cyclicTasks)

    expect(new Set(cycle)).toEqual(new Set(['A', 'B', 'C']))
  })

  it('uses canonical dependencies over legacy dependeDeId links when both are present', () => {
    const tasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', orden: 1, dependeDeId: 'C' }),
      makeTask({ id: 'B', nombre: 'B', orden: 2, dependeDeId: 'A' }),
      makeTask({ id: 'C', nombre: 'C', orden: 3, dependeDeId: 'B' }),
    ]

    const dependencies: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'C', dependsOnTaskId: 'B', kind: 'FS' },
    ]

    const ordered = topologicalSort(tasks, dependencies).map((task) => task.id)
    expect(ordered).toEqual(['A', 'B', 'C'])
  })

  it('recalculates FS chain A -> B -> C using next working day start', () => {
    const scheduled = recalculateCascade({
      tasks: baseTasks,
      dependencies: [
        { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
        { taskId: 'C', dependsOnTaskId: 'B', kind: 'FS' },
      ],
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const byId = new Map(scheduled.map((task) => [task.id, task]))
    expect(byId.get('A')?.fechaInicio).toBe('2026-04-06')
    expect(byId.get('A')?.fechaFin).toBe('2026-04-07')
    expect(byId.get('B')?.fechaInicio).toBe('2026-04-08')
    expect(byId.get('C')?.fechaInicio).toBe('2026-04-10')
  })

  it('starts disconnected tasks at project start baseline', () => {
    const disconnected: TaskInput[] = [
      makeTask({ id: 'A', orden: 1, dependeDeId: null, duracionDias: 1 }),
      makeTask({ id: 'B', orden: 2, dependeDeId: null, duracionDias: 2 }),
    ]

    const scheduled = recalculateCascade({
      tasks: disconnected,
      dependencies: [],
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    expect(scheduled[0]?.fechaInicio).toBe('2026-04-06')
    expect(scheduled[1]?.fechaInicio).toBe('2026-04-06')
  })

  it('applies max predecessor finish rule for multi-predecessor successors', () => {
    const tasks: TaskInput[] = [
      makeTask({ id: 'A', orden: 1, duracionDias: 2, dependeDeId: null }),
      makeTask({ id: 'B', orden: 2, duracionDias: 4, dependeDeId: null }),
      makeTask({ id: 'C', orden: 3, duracionDias: 1, dependeDeId: null }),
    ]
    const dependencies: TaskDependency[] = [
      { taskId: 'C', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'C', dependsOnTaskId: 'B', kind: 'FS' },
    ]

    const scheduled = recalculateCascade({
      tasks,
      dependencies,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const byId = new Map(scheduled.map((task) => [task.id, task]))
    expect(byId.get('B')?.fechaFin).toBe('2026-04-09')
    expect(byId.get('C')?.fechaInicio).toBe('2026-04-10')
  })

  it('returns changedTaskIds and preserves parity with full recompute', () => {
    const params: RecalculateParams = {
      tasks: [
        makeTask({ id: 'A', nombre: 'A', duracionDias: 5, dependeDeId: null, orden: 1 }),
        makeTask({ id: 'B', nombre: 'B', duracionDias: 2, dependeDeId: 'A', orden: 2 }),
        makeTask({ id: 'C', nombre: 'C', duracionDias: 1, dependeDeId: 'B', orden: 3 }),
      ],
      dependencies: [
        { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
        { taskId: 'C', dependsOnTaskId: 'B', kind: 'FS' },
      ],
      obraStartDate: '2026-04-06',
      holidays: new Set(),
      changedTaskId: 'A',
    }

    const full = recalculateCascade(params)
    const incrementalLike = recalculateCascadeWithDetails(params)

    expect(incrementalLike.tasks).toEqual(full)
    expect(new Set(incrementalLike.changedTaskIds)).toEqual(new Set(['A', 'B', 'C']))
  })

  it('shifts downstream tasks when predecessor duration increases in A -> B -> C chain', () => {
    const dependencies: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'C', dependsOnTaskId: 'B', kind: 'FS' },
    ]

    const initial = recalculateCascade({
      tasks: [
        makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
        makeTask({ id: 'B', nombre: 'B', duracionDias: 2, dependeDeId: 'A', orden: 2 }),
        makeTask({ id: 'C', nombre: 'C', duracionDias: 1, dependeDeId: 'B', orden: 3 }),
      ],
      dependencies,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const afterAChange = recalculateCascade({
      tasks: [
        makeTask({ id: 'A', nombre: 'A', duracionDias: 4, dependeDeId: null, orden: 1 }),
        makeTask({ id: 'B', nombre: 'B', duracionDias: 2, dependeDeId: 'A', orden: 2 }),
        makeTask({ id: 'C', nombre: 'C', duracionDias: 1, dependeDeId: 'B', orden: 3 }),
      ],
      dependencies,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const initialById = new Map(initial.map((task) => [task.id, task]))
    const changedById = new Map(afterAChange.map((task) => [task.id, task]))

    expect(initialById.get('B')?.fechaInicio).toBe('2026-04-08')
    expect(initialById.get('C')?.fechaInicio).toBe('2026-04-10')

    expect(changedById.get('B')?.fechaInicio).toBe('2026-04-10')
    expect(changedById.get('C')?.fechaInicio).toBe('2026-04-14')
  })

  it('throws clear invalid duration error when duration is below one', () => {
    expect(() =>
      recalculateCascade({
        tasks: [makeTask({ id: 'A', duracionDias: 0 })],
        dependencies: [],
        obraStartDate: '2026-04-06',
        holidays: new Set(),
      })
    ).toThrow('INVALID_DURATION:A:0')
  })
})
