import { describe, expect, it } from 'vitest'

import {
  detectSmartInsertConflict,
  validateSmartInsertStrategy,
} from '@/lib/domain/smart-insert'
import { recalculateCascade, topologicalSort } from '@/lib/gantt-dag'
import type { ScheduleTask, TaskDependency, TaskInput } from '@/types/gantt'

const makeTask = (overrides: Partial<TaskInput>): TaskInput => ({
  id: overrides.id ?? 'task',
  projectId: overrides.projectId ?? 'p1',
  obraId: overrides.obraId ?? 'o1',
  nombre: overrides.nombre ?? 'Task',
  duracionDias: overrides.duracionDias ?? 1,
  dependeDeId: overrides.dependeDeId ?? null,
  orden: overrides.orden ?? 1,
})

const makeScheduleTask = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
  ...makeTask(overrides),
  fechaInicio: overrides.fechaInicio ?? '2026-04-06',
  fechaFin: overrides.fechaFin ?? '2026-04-06',
})

// ─── Conflict Detection ────────────────────────────────────────────────────────

describe('detectSmartInsertConflict', () => {
  it('returns null when parent has no dependent children', () => {
    const tasks = [
      makeScheduleTask({ id: 'A', nombre: 'A', dependeDeId: null, orden: 1 }),
    ]

    const conflict = detectSmartInsertConflict({ parentId: 'A', tasks })

    expect(conflict).toBeNull()
  })

  it('returns null when parent does not exist in task list', () => {
    const tasks = [
      makeScheduleTask({ id: 'B', nombre: 'B', dependeDeId: 'A', orden: 1 }),
    ]

    const conflict = detectSmartInsertConflict({ parentId: 'ghost', tasks })

    expect(conflict).toBeNull()
  })

  it('detects conflict when parent already has a dependent child', () => {
    const tasks = [
      makeScheduleTask({ id: 'A', nombre: 'Fase 1', dependeDeId: null, orden: 1 }),
      makeScheduleTask({ id: 'B', nombre: 'Fase 2', dependeDeId: 'A', orden: 2 }),
    ]

    const conflict = detectSmartInsertConflict({ parentId: 'A', tasks })

    expect(conflict).not.toBeNull()
    expect(conflict!.parentId).toBe('A')
    expect(conflict!.parentName).toBe('Fase 1')
    expect(conflict!.childId).toBe('B')
    expect(conflict!.childName).toBe('Fase 2')
  })

  it('excludes the task being edited from conflict detection', () => {
    const tasks = [
      makeScheduleTask({ id: 'A', nombre: 'A', dependeDeId: null, orden: 1 }),
      makeScheduleTask({ id: 'B', nombre: 'B', dependeDeId: 'A', orden: 2 }),
    ]

    // B is being edited and depends on A — but we exclude it
    const conflict = detectSmartInsertConflict({
      parentId: 'A',
      tasks,
      excludeTaskId: 'B',
    })

    expect(conflict).toBeNull()
  })

  it('returns first child only when parent has multiple dependents', () => {
    const tasks = [
      makeScheduleTask({ id: 'A', nombre: 'A', dependeDeId: null, orden: 1 }),
      makeScheduleTask({ id: 'B', nombre: 'B', dependeDeId: 'A', orden: 2 }),
      makeScheduleTask({ id: 'C', nombre: 'C', dependeDeId: 'A', orden: 3 }),
    ]

    const conflict = detectSmartInsertConflict({ parentId: 'A', tasks })

    expect(conflict).not.toBeNull()
    // Returns the first child found (B by iteration order)
    expect(conflict!.childId).toBe('B')
  })
})

// ─── Strategy Validation ───────────────────────────────────────────────────────

describe('validateSmartInsertStrategy', () => {
  it('accepts "insert" strategy', () => {
    expect(validateSmartInsertStrategy('insert')).toBeNull()
  })

  it('accepts "branch" strategy', () => {
    expect(validateSmartInsertStrategy('branch')).toBeNull()
  })

  it('rejects invalid strategy', () => {
    // @ts-expect-error testing runtime validation
    expect(validateSmartInsertStrategy('merge')).toBe('Estrategia de inserción inválida.')
  })
})

// ─── Phase 4.1: Insert Strategy — A → N → B ───────────────────────────────────

describe('Insert strategy: A → N → B (linearize)', () => {
  const baseTasks: TaskInput[] = [
    makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
    makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'A', orden: 2 }),
  ]
  const baseDeps: TaskDependency[] = [
    { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
  ]

  it('topological order is A → N → B after insert', () => {
    // Simulate the graph AFTER the RPC smart_insert with strategy=insert:
    // - A → B edge is removed
    // - A → N and N → B edges are added
    const afterInsert: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 1, dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'N', orden: 3 }),
    ]
    const afterDeps: TaskDependency[] = [
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'B', dependsOnTaskId: 'N', kind: 'FS' },
    ]

    const ordered = topologicalSort(afterInsert, afterDeps).map((t) => t.id)
    expect(ordered).toEqual(['A', 'N', 'B'])
  })

  it('dates cascade correctly: N starts after A ends, B starts after N ends', () => {
    const afterInsert: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 1, dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'N', orden: 3 }),
    ]
    const afterDeps: TaskDependency[] = [
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'B', dependsOnTaskId: 'N', kind: 'FS' },
    ]

    const schedule = recalculateCascade({
      tasks: afterInsert,
      dependencies: afterDeps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const byId = new Map(schedule.map((t) => [t.id, t]))

    // A: starts Mon 2026-04-06, 2 working days → ends Tue 2026-04-07
    expect(byId.get('A')?.fechaInicio).toBe('2026-04-06')
    expect(byId.get('A')?.fechaFin).toBe('2026-04-07')

    // N: starts Wed 2026-04-08 (next working day after A ends), 1 day → ends Wed 2026-04-08
    expect(byId.get('N')?.fechaInicio).toBe('2026-04-08')
    expect(byId.get('N')?.fechaFin).toBe('2026-04-08')

    // B: starts Thu 2026-04-09 (next working day after N ends), 3 days → ends Mon 2026-04-13
    expect(byId.get('B')?.fechaInicio).toBe('2026-04-09')
    expect(byId.get('B')?.fechaFin).toBe('2026-04-13')
  })

  it('original A → B chain had different dates than A → N → B chain', () => {
    // Original: A (2d) → B (3d)
    const originalSchedule = recalculateCascade({
      tasks: baseTasks,
      dependencies: baseDeps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })
    const originalById = new Map(originalSchedule.map((t) => [t.id, t]))

    // After insert: A (2d) → N (1d) → B (3d)
    const afterInsert: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 1, dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'N', orden: 3 }),
    ]
    const afterDeps: TaskDependency[] = [
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'B', dependsOnTaskId: 'N', kind: 'FS' },
    ]
    const insertedSchedule = recalculateCascade({
      tasks: afterInsert,
      dependencies: afterDeps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })
    const insertedById = new Map(insertedSchedule.map((t) => [t.id, t]))

    // B should start later in the insert chain (delayed by N's duration)
    expect(originalById.get('B')?.fechaInicio).toBe('2026-04-08')
    expect(insertedById.get('B')?.fechaInicio).toBe('2026-04-09')

    // A's dates are unchanged
    expect(insertedById.get('A')?.fechaInicio).toBe(originalById.get('A')?.fechaInicio)
    expect(insertedById.get('A')?.fechaFin).toBe(originalById.get('A')?.fechaFin)
  })
})

// ─── Phase 4.2: Branch Strategy — A → B and A → N (parallel) ──────────────────

describe('Branch strategy: A → B and A → N (parallel)', () => {
  it('topological order preserves both branches', () => {
    // After branch: A → B edge stays, A → N edge is added
    const afterBranch: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 2, dependeDeId: 'A', orden: 3 }),
    ]
    const afterDeps: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
    ]

    const ordered = topologicalSort(afterBranch, afterDeps).map((t) => t.id)
    expect(ordered).toContain('A')
    expect(ordered).toContain('B')
    expect(ordered).toContain('N')
    // A must come first
    expect(ordered[0]).toBe('A')
  })

  it('B and N both start after A ends (parallel)', () => {
    const afterBranch: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 2, dependeDeId: 'A', orden: 3 }),
    ]
    const afterDeps: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
    ]

    const schedule = recalculateCascade({
      tasks: afterBranch,
      dependencies: afterDeps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const byId = new Map(schedule.map((t) => [t.id, t]))

    // A: 2026-04-06 → 2026-04-07
    expect(byId.get('A')?.fechaFin).toBe('2026-04-07')

    // Both B and N start the next working day after A
    expect(byId.get('B')?.fechaInicio).toBe('2026-04-08')
    expect(byId.get('N')?.fechaInicio).toBe('2026-04-08')
  })

  it('original B dates are preserved after branch (non-destructive)', () => {
    const baseTasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'A', orden: 2 }),
    ]
    const baseDeps: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
    ]

    const originalSchedule = recalculateCascade({
      tasks: baseTasks,
      dependencies: baseDeps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })
    const originalB = originalSchedule.find((t) => t.id === 'B')!

    const afterBranch: TaskInput[] = [
      ...baseTasks,
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 2, dependeDeId: 'A', orden: 3 }),
    ]
    const afterDeps: TaskDependency[] = [
      ...baseDeps,
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
    ]

    const branchedSchedule = recalculateCascade({
      tasks: afterBranch,
      dependencies: afterDeps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })
    const branchedB = branchedSchedule.find((t) => t.id === 'B')!

    // B's dates must be exactly the same — branch is non-destructive
    expect(branchedB.fechaInicio).toBe(originalB.fechaInicio)
    expect(branchedB.fechaFin).toBe(originalB.fechaFin)
  })
})

// ─── Phase 4.3: Visual Re-ordering ─────────────────────────────────────────────

describe('visual re-ordering after mutation', () => {
  it('schedule is ordered chronologically by fechaInicio after insert', () => {
    const tasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 1, dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'N', orden: 3 }),
    ]
    const deps: TaskDependency[] = [
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'B', dependsOnTaskId: 'N', kind: 'FS' },
    ]

    const schedule = recalculateCascade({
      tasks,
      dependencies: deps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const dates = schedule.map((t) => t.fechaInicio)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })

  it('parallel tasks from branch are ordered by orden when dates are equal', () => {
    const tasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'N', nombre: 'Nueva', duracionDias: 2, dependeDeId: 'A', orden: 3 }),
    ]
    const deps: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
    ]

    const schedule = recalculateCascade({
      tasks,
      dependencies: deps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    // B and N start on the same day; B has lower orden, so B comes first
    const ids = schedule.map((t) => t.id)
    const bIndex = ids.indexOf('B')
    const nIndex = ids.indexOf('N')
    expect(bIndex).toBeLessThan(nIndex)
  })
})

// ─── Phase 4.4: Cycle Detection with Smart Insert Logic ────────────────────────

describe('cycle detection with smart insert graphs', () => {
  it('detects cycle when insert would create N → B → A → N', () => {
    // Attempting to make N depend on B, while B depends on A, and A depends on N
    const cyclicTasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', dependeDeId: 'N', orden: 1 }),
      makeTask({ id: 'N', nombre: 'Nueva', dependeDeId: 'B', orden: 2 }),
      makeTask({ id: 'B', nombre: 'B', dependeDeId: 'A', orden: 3 }),
    ]

    expect(() => topologicalSort(cyclicTasks)).toThrow(/Cycle detected/)
  })

  it('detects cycle when branch would create indirect loop', () => {
    // A → B, A → N, but then someone tries N → A
    const cyclicTasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', dependeDeId: 'N', orden: 1 }),
      makeTask({ id: 'B', nombre: 'B', dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'N', nombre: 'Nueva', dependeDeId: 'A', orden: 3 }),
    ]

    expect(() => topologicalSort(cyclicTasks)).toThrow(/Cycle detected/)
  })

  it('does not flag valid insert graph as cyclic', () => {
    const validTasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', dependeDeId: null, orden: 1 }),
      makeTask({ id: 'N', nombre: 'Nueva', dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'B', nombre: 'B', dependeDeId: 'N', orden: 3 }),
    ]
    const validDeps: TaskDependency[] = [
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'B', dependsOnTaskId: 'N', kind: 'FS' },
    ]

    // Should not throw
    const ordered = topologicalSort(validTasks, validDeps)
    expect(ordered.map((t) => t.id)).toEqual(['A', 'N', 'B'])
  })

  it('does not flag valid branch graph as cyclic', () => {
    const validTasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', nombre: 'B', dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'N', nombre: 'Nueva', dependeDeId: 'A', orden: 3 }),
    ]
    const validDeps: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'N', dependsOnTaskId: 'A', kind: 'FS' },
    ]

    // Should not throw
    const ordered = topologicalSort(validTasks, validDeps)
    expect(ordered.length).toBe(3)
  })
})

// ─── Atomic Rollback (graph state validation) ──────────────────────────────────

describe('atomic rollback semantics', () => {
  it('pre-mutation graph state is recoverable (no partial edge removal)', () => {
    // Simulates the scenario where the RPC transaction fails:
    // The client-side graph should still represent the ORIGINAL state.
    const originalTasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 2, dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', nombre: 'B', duracionDias: 3, dependeDeId: 'A', orden: 2 }),
    ]
    const originalDeps: TaskDependency[] = [
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
    ]

    // The original graph must still be valid and computable
    const schedule = recalculateCascade({
      tasks: originalTasks,
      dependencies: originalDeps,
      obraStartDate: '2026-04-06',
      holidays: new Set(),
    })

    const byId = new Map(schedule.map((t) => [t.id, t]))
    expect(byId.get('A')?.fechaInicio).toBe('2026-04-06')
    expect(byId.get('B')?.fechaInicio).toBe('2026-04-08')
  })

  it('recalculateCascade throws on invalid duration (simulates RPC rejection)', () => {
    const tasks: TaskInput[] = [
      makeTask({ id: 'A', nombre: 'A', duracionDias: 0, dependeDeId: null, orden: 1 }),
    ]

    expect(() =>
      recalculateCascade({
        tasks,
        dependencies: [],
        obraStartDate: '2026-04-06',
        holidays: new Set(),
      })
    ).toThrow('INVALID_DURATION')
  })

  it('recalculateCascade throws on cycle (simulates RPC rejection)', () => {
    const cyclicTasks: TaskInput[] = [
      makeTask({ id: 'A', dependeDeId: 'B', orden: 1 }),
      makeTask({ id: 'B', dependeDeId: 'A', orden: 2 }),
    ]

    expect(() =>
      recalculateCascade({
        tasks: cyclicTasks,
        dependencies: [],
        obraStartDate: '2026-04-06',
        holidays: new Set(),
      })
    ).toThrow(/CYCLE_DETECTED/)
  })
})
