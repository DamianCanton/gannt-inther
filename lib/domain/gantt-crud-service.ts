import 'server-only'

import { detectCycle } from '@/lib/gantt-dag'
import type { ObraSchedule, TaskDependency, TaskInput, Uuid } from '@/types/gantt'
import type { SmartInsertPayload } from '@/components/gantt/gantt-types'

export type TaskMutationIntent = 'create' | 'update' | 'delete'

export type TaskMutationErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_PROJECT_MEMBERSHIP'
  | 'FORBIDDEN_OR_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DEPENDENCY_CYCLE'
  | 'ATOMIC_WRITE_FAILED'
  | 'MUTATION_UNAVAILABLE'

export class TaskMutationError extends Error {
  public readonly code: TaskMutationErrorCode

  public constructor(code: TaskMutationErrorCode, message: string) {
    super(message)
    this.name = 'TaskMutationError'
    this.code = code
  }
}

export type CreateTaskCommand = {
  intent: 'create'
  obraId: Uuid
  taskId?: Uuid
  nombre: string
  duracionDias: number
  dependeDeId: Uuid | null
  parentId?: Uuid | null
  offsetDias?: number
  smartInsert?: SmartInsertPayload
}

export type UpdateTaskCommand = {
  intent: 'update'
  obraId: Uuid
  taskId: Uuid
  nombre?: string
  duracionDias?: number
  dependeDeId: Uuid | null
  parentId?: Uuid | null
  offsetDias?: number
  smartInsert?: SmartInsertPayload
}

export type DeleteTaskCommand = {
  intent: 'delete'
  obraId: Uuid
  taskId: Uuid
}

export type TaskMutationCommand = CreateTaskCommand | UpdateTaskCommand | DeleteTaskCommand

export interface PreparedTaskMutation {
  intent: TaskMutationIntent
  taskId: Uuid | null
  payload: {
    nombre?: string
    duracion_dias?: number
    depende_de_id?: Uuid | null
    parent_id?: Uuid | null
    offset_dias?: number
    smart_insert?: SmartInsertPayload
  }
  previewTasks: TaskInput[]
  canonicalDependencies: TaskDependency[]
}

type PostgrestLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export function mapMutationErrorToDomainCode(error: unknown): TaskMutationErrorCode {
  const postgrestError = error as PostgrestLikeError
  const message = `${postgrestError?.message ?? ''}`.toUpperCase()
  const details = `${postgrestError?.details ?? ''}`.toUpperCase()
  const hint = `${postgrestError?.hint ?? ''}`.toUpperCase()
  const code = `${postgrestError?.code ?? ''}`.toUpperCase()

  if (message.includes('DEPENDENCY_CYCLE')) {
    return 'DEPENDENCY_CYCLE'
  }

  if (message.includes('VALIDATION_ERROR') || message.includes('INVALID_INTENT')) {
    return 'VALIDATION_ERROR'
  }

  if (message.includes('FORBIDDEN_OR_NOT_FOUND')) {
    return 'FORBIDDEN_OR_NOT_FOUND'
  }

  if (
    code === '42501' ||
    code === 'PGRST202' ||
    code === '42883' ||
    message.includes('MUTATE_TASK_GRAPH') ||
    details.includes('MUTATE_TASK_GRAPH') ||
    hint.includes('MUTATE_TASK_GRAPH')
  ) {
    return 'MUTATION_UNAVAILABLE'
  }

  return 'ATOMIC_WRITE_FAILED'
}

export class GanttCrudService {
  public prepareTaskMutation(params: {
    schedule: ObraSchedule
    command: TaskMutationCommand
  }): PreparedTaskMutation {
    const { schedule, command } = params
    this.assertExistingHierarchyInvariant(schedule.tasks)

    this.assertObraScope(schedule.obra.id, command.obraId)

    if (command.intent === 'delete') {
      const task = schedule.tasks.find((currentTask) => currentTask.id === command.taskId)
      if (!task) {
        throw new TaskMutationError('FORBIDDEN_OR_NOT_FOUND', 'Task outside authorized scope.')
      }

      const previewTasks = schedule.tasks.filter((currentTask) => currentTask.id !== command.taskId)
      return {
        intent: 'delete',
        taskId: command.taskId,
        payload: {},
        previewTasks,
        canonicalDependencies: this.buildCanonicalDependencies(previewTasks),
      }
    }

    if (command.intent === 'create') {
      const createdTaskId = command.taskId ?? crypto.randomUUID()
      const nombre = this.assertValidNombre(command.nombre)
      const duracionDias = this.assertValidDuration(command.duracionDias)
      const dependeDeId = command.dependeDeId
      const parentId = command.parentId ?? null
      const offsetDias = this.assertValidOffset(command.offsetDias ?? 0)
      this.assertParentOnlyDependencyInvariant({ parentId, dependeDeId })
      this.assertValidDependency({
        schedule,
        taskId: createdTaskId,
        dependeDeId,
      })
      this.assertHierarchyAssignment({
        schedule,
        taskId: createdTaskId,
        parentId,
        offsetDias,
      })

      // Determine the orden for the new task.
      // When smartInsert is present, the task is placed at a specific position
      // (right after the parent for 'branch', right at the child's position for 'insert')
      // and subsequent tasks are shifted down by 1.
      let nextOrden: number

      if (command.smartInsert) {
        // En ambas estrategias (insert o branch), visualmente la tarea nueva
        // debe aparecer JUSTO ABAJO del padre (parent.orden + 1).
        // Así no se va "al fondo" ni a la posición lejana del hijo.
        const conflictParent = schedule.tasks.find((t) => t.id === command.smartInsert!.conflictParentId)
        nextOrden = conflictParent ? conflictParent.orden + 1 : schedule.tasks.reduce((maxOrden, task) => Math.max(maxOrden, task.orden), 0) + 1
      } else {
        nextOrden = schedule.tasks.reduce((maxOrden, task) => Math.max(maxOrden, task.orden), 0) + 1
      }

      const createdTask: TaskInput = {
        id: createdTaskId,
        projectId: schedule.obra.projectId,
        obraId: schedule.obra.id,
        nombre,
        duracionDias,
        dependeDeId,
        parentId,
        offsetDias,
        orden: nextOrden,
      }

      // When smartInsert is active, shift orden of all tasks >= new_orden by 1.
      const shiftedTasks = command.smartInsert
        ? schedule.tasks.map((task) =>
            task.orden >= nextOrden ? { ...task, orden: task.orden + 1 } : task
          )
        : schedule.tasks

      const previewTasks = [...shiftedTasks, createdTask]
      this.assertNoCycle(previewTasks)

      return {
        intent: 'create',
        taskId: createdTaskId,
        payload: {
          nombre,
          duracion_dias: duracionDias,
          depende_de_id: dependeDeId,
          parent_id: parentId,
          offset_dias: offsetDias,
          smart_insert: command.smartInsert,
        },
        previewTasks,
        canonicalDependencies: this.buildCanonicalDependencies(previewTasks),
      }
    }

    const existingTask = schedule.tasks.find((task) => task.id === command.taskId)
    if (!existingTask) {
      throw new TaskMutationError('FORBIDDEN_OR_NOT_FOUND', 'Task outside authorized scope.')
    }

    const nombre = command.nombre === undefined
      ? existingTask.nombre
      : this.assertValidNombre(command.nombre)
    const duracionDias = command.duracionDias === undefined
      ? existingTask.duracionDias
      : this.assertValidDuration(command.duracionDias)
    const dependeDeId = command.dependeDeId === undefined
      ? existingTask.dependeDeId
      : command.dependeDeId
    const parentId = command.parentId === undefined
      ? existingTask.parentId ?? null
      : command.parentId
    const offsetDias = command.offsetDias === undefined
      ? existingTask.offsetDias ?? 0
      : this.assertValidOffset(command.offsetDias)

    this.assertParentOnlyDependencyInvariant({ parentId, dependeDeId })

    this.assertParentDurationEditAllowed({
      schedule,
      taskId: existingTask.id,
      previousDuration: existingTask.duracionDias,
      nextDuration: duracionDias,
      isExplicitDurationUpdate: command.duracionDias !== undefined,
    })

    this.assertValidDependency({
      schedule,
      taskId: existingTask.id,
      dependeDeId,
    })
    this.assertHierarchyAssignment({
      schedule,
      taskId: existingTask.id,
      parentId,
      offsetDias,
    })

    const previewTasks = schedule.tasks.map((task) => {
      if (task.id !== existingTask.id) {
        return task
      }

      return {
        ...task,
        nombre,
        duracionDias,
        dependeDeId,
        parentId,
        offsetDias,
      }
    })

    this.assertExistingHierarchyInvariant(previewTasks)
    this.assertNoCycle(previewTasks)

    return {
      intent: 'update',
      taskId: existingTask.id,
      payload: {
        nombre,
        duracion_dias: duracionDias,
        depende_de_id: dependeDeId,
        parent_id: parentId,
        offset_dias: offsetDias,
        smart_insert: command.smartInsert,
      },
      previewTasks,
      canonicalDependencies: this.buildCanonicalDependencies(previewTasks),
    }
  }

  public buildCanonicalDependencies(
    tasks: Array<Pick<TaskInput, 'id' | 'dependeDeId' | 'parentId'>>
  ): TaskDependency[] {
    const parentTaskIds = new Set(
      tasks
        .filter((task) => (task.parentId ?? null) === null)
        .map((task) => task.id)
    )

    return tasks
      .filter((task): task is Pick<TaskInput, 'id' | 'dependeDeId'> & { dependeDeId: Uuid } =>
        task.dependeDeId !== null && parentTaskIds.has(task.id) && parentTaskIds.has(task.dependeDeId)
      )
      .map((task) => ({
        taskId: task.id,
        dependsOnTaskId: task.dependeDeId,
        kind: 'FS' as const,
      }))
  }

  private assertObraScope(expectedObraId: Uuid, requestedObraId: Uuid): void {
    if (expectedObraId !== requestedObraId) {
      throw new TaskMutationError('FORBIDDEN_OR_NOT_FOUND', 'Obra outside authorized scope.')
    }
  }

  private assertValidNombre(nombre: string): string {
    const normalized = nombre.trim()
    if (normalized.length === 0) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Task name is required.')
    }

    return normalized
  }

  private assertValidDuration(duration: number): number {
    if (!Number.isInteger(duration) || duration < 1) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Task duration must be >= 1 working day.')
    }

    return duration
  }

  private assertValidOffset(offset: number): number {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Child offset must be a non-negative integer.')
    }

    return offset
  }

  private assertValidDependency(params: {
    schedule: ObraSchedule
    taskId: Uuid
    dependeDeId: Uuid | null
  }): void {
    if (!params.dependeDeId) {
      return
    }

    if (params.dependeDeId === params.taskId) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Self dependency is not allowed.')
    }

    const dependencyExistsInScope = params.schedule.tasks.some((task) => task.id === params.dependeDeId)
    if (!dependencyExistsInScope) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Dependency target is outside obra scope.')
    }
  }

  private assertNoCycle(tasks: TaskInput[]): void {
    const parentTasks = tasks.filter((task) => (task.parentId ?? null) === null)
    const cycle = detectCycle(parentTasks)
    if (cycle.length > 0) {
      throw new TaskMutationError('DEPENDENCY_CYCLE', `Cycle detected: ${cycle.join(' -> ')}`)
    }
  }

  private assertExistingHierarchyInvariant(tasks: TaskInput[]): void {
    const taskById = new Map(tasks.map((task) => [task.id, task]))

    for (const task of tasks) {
      const parentId = task.parentId ?? null
      const offsetDias = task.offsetDias ?? 0

      this.assertValidOffset(offsetDias)

      if (parentId === null) {
        if (offsetDias !== 0) {
          throw new TaskMutationError('VALIDATION_ERROR', 'Top-level tasks must keep offset 0.')
        }
        continue
      }

      if (task.dependeDeId !== null) {
        throw new TaskMutationError('VALIDATION_ERROR', 'Child tasks cannot carry dependencies.')
      }

      if (parentId === task.id) {
        throw new TaskMutationError('VALIDATION_ERROR', 'Task cannot be parent of itself.')
      }

      const parentTask = taskById.get(parentId)
      if (!parentTask) {
        throw new TaskMutationError('VALIDATION_ERROR', 'Parent task not found in obra scope.')
      }

      if ((parentTask.parentId ?? null) !== null) {
        throw new TaskMutationError('VALIDATION_ERROR', 'Hierarchy depth exceeds V1 limit (max depth 1).')
      }
    }
  }

  private assertHierarchyAssignment(params: {
    schedule: ObraSchedule
    taskId: Uuid
    parentId: Uuid | null
    offsetDias: number
  }): void {
    const { schedule, taskId, parentId, offsetDias } = params

    if (parentId === null) {
      if (offsetDias !== 0) {
        throw new TaskMutationError('VALIDATION_ERROR', 'Top-level tasks must keep offset 0.')
      }
      return
    }

    if (parentId === taskId) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Task cannot be parent of itself.')
    }

    const parentTask = schedule.tasks.find((task) => task.id === parentId)
    if (!parentTask) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Parent task is outside obra scope.')
    }

    if ((parentTask.parentId ?? null) !== null) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Hierarchy depth exceeds V1 limit (max depth 1).')
    }

    if (parentTask.duracionDias <= 1) {
      throw new TaskMutationError('VALIDATION_ERROR', '1-day parent tasks cannot have children.')
    }
  }

  private assertParentOnlyDependencyInvariant(params: {
    parentId: Uuid | null
    dependeDeId: Uuid | null
  }): void {
    if (params.parentId !== null && params.dependeDeId !== null) {
      throw new TaskMutationError('VALIDATION_ERROR', 'Child tasks cannot carry dependencies.')
    }
  }

  private assertParentDurationEditAllowed(params: {
    schedule: ObraSchedule
    taskId: Uuid
    previousDuration: number
    nextDuration: number
    isExplicitDurationUpdate: boolean
  }): void {
    const { schedule, taskId, previousDuration, nextDuration, isExplicitDurationUpdate } = params

    if (!isExplicitDurationUpdate || previousDuration === nextDuration) {
      return
    }

    const hasChildren = schedule.tasks.some((task) => (task.parentId ?? null) === taskId)
    if (hasChildren) {
      throw new TaskMutationError(
        'VALIDATION_ERROR',
        'Parent duration is derived from children and cannot be edited manually.'
      )
    }
  }
}
