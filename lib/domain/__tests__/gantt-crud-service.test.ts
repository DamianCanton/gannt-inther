import { describe, expect, it } from 'vitest'

import {
  GanttCrudService,
  mapMutationErrorToDomainCode,
  TaskMutationError,
} from '@/lib/domain/gantt-crud-service'
import type { ObraSchedule, TaskInput } from '@/types/gantt'

const makeTask = (overrides: Partial<TaskInput>): TaskInput => ({
  id: overrides.id ?? 'task',
  projectId: overrides.projectId ?? 'p1',
  obraId: overrides.obraId ?? 'o1',
  nombre: overrides.nombre ?? 'Task',
  duracionDias: overrides.duracionDias ?? 1,
  dependeDeId: overrides.dependeDeId ?? null,
  orden: overrides.orden ?? 1,
})

const makeSchedule = (tasks: TaskInput[]): ObraSchedule => ({
  obra: {
    id: 'o1',
    projectId: 'p1',
    nombre: 'Obra 1',
    cliente: null,
    tipoObra: 'Tipo A',
    fechaInicioGlobal: '2026-04-06',
    vigenciaTexto: null,
  },
  tasks,
  dependencies: [],
  holidays: new Set(),
})

describe('gantt-crud-service', () => {
  it('rejects self dependency with VALIDATION_ERROR', () => {
    const service = new GanttCrudService()
    const schedule = makeSchedule([makeTask({ id: 't1', dependeDeId: null })])

    expect(() =>
      service.prepareTaskMutation({
        schedule,
        command: {
          intent: 'update',
          obraId: 'o1',
          taskId: 't1',
          dependeDeId: 't1',
        },
      })
    ).toThrowError(TaskMutationError)

    try {
      service.prepareTaskMutation({
        schedule,
        command: {
          intent: 'update',
          obraId: 'o1',
          taskId: 't1',
          dependeDeId: 't1',
        },
      })
    } catch (error) {
      expect(error).toBeInstanceOf(TaskMutationError)
      expect((error as TaskMutationError).code).toBe('VALIDATION_ERROR')
    }
  })

  it('rejects dependency outside obra scope with VALIDATION_ERROR', () => {
    const service = new GanttCrudService()
    const schedule = makeSchedule([makeTask({ id: 't1', dependeDeId: null })])

    expect(() =>
      service.prepareTaskMutation({
        schedule,
        command: {
          intent: 'update',
          obraId: 'o1',
          taskId: 't1',
          dependeDeId: 'task-from-other-obra',
        },
      })
    ).toThrowError(TaskMutationError)
  })

  it('rejects cyclic update with DEPENDENCY_CYCLE', () => {
    const service = new GanttCrudService()
    const schedule = makeSchedule([
      makeTask({ id: 'A', dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', dependeDeId: 'A', orden: 2 }),
    ])

    try {
      service.prepareTaskMutation({
        schedule,
        command: {
          intent: 'update',
          obraId: 'o1',
          taskId: 'A',
          dependeDeId: 'B',
        },
      })
    } catch (error) {
      expect(error).toBeInstanceOf(TaskMutationError)
      expect((error as TaskMutationError).code).toBe('DEPENDENCY_CYCLE')
    }
  })

  it('creates canonical dependency mapping from dependeDeId', () => {
    const service = new GanttCrudService()
    const schedule = makeSchedule([
      makeTask({ id: 'A', dependeDeId: null, orden: 1 }),
      makeTask({ id: 'B', dependeDeId: 'A', orden: 2 }),
      makeTask({ id: 'C', dependeDeId: null, orden: 3 }),
    ])

    const prepared = service.prepareTaskMutation({
      schedule,
      command: {
        intent: 'update',
        obraId: 'o1',
        taskId: 'C',
        dependeDeId: 'B',
      },
    })

    expect(prepared.canonicalDependencies).toEqual([
      { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      { taskId: 'C', dependsOnTaskId: 'B', kind: 'FS' },
    ])
  })

  it('maps rpc/database failures to domain error codes', () => {
    expect(mapMutationErrorToDomainCode({ message: 'DEPENDENCY_CYCLE' })).toBe('DEPENDENCY_CYCLE')
    expect(mapMutationErrorToDomainCode({ message: 'VALIDATION_ERROR:SELF_DEPENDENCY' })).toBe(
      'VALIDATION_ERROR'
    )
    expect(mapMutationErrorToDomainCode({ code: 'PGRST202', message: 'function not found' })).toBe(
      'MUTATION_UNAVAILABLE'
    )
    expect(mapMutationErrorToDomainCode({ message: 'unexpected timeout' })).toBe('ATOMIC_WRITE_FAILED')
  })
})
