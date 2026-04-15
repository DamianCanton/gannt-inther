'use server'

import {
  GanttCrudService,
  TaskMutationError,
  type TaskMutationCommand,
  type TaskMutationErrorCode,
} from '@/lib/domain/gantt-crud-service'
import { createScheduleWithDetails } from '@/lib/gantt-scheduler'
import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { GanttRepo, RepoAccessError } from '@/lib/repositories/gantt-repo'
import { createServerClient } from '@/lib/supabase/server'
import type { Uuid } from '@/types/gantt'
import type { GanttMutationResult } from '@/components/gantt/gantt-types'

export type MutateTaskInput = {
  obraId: Uuid
} & (
  | {
      intent: 'create'
      taskId?: Uuid
      nombre: string
      duracionDias: number
      dependeDeId: Uuid | null
    }
  | {
      intent: 'update'
      taskId: Uuid
      nombre?: string
      duracionDias?: number
      dependeDeId?: Uuid | null
    }
  | {
      intent: 'delete'
      taskId: Uuid
    }
)

function mapLegacySchedulerError(error: Error): string {
  if (error.message.startsWith('CYCLE_DETECTED:')) {
    return `Dependencia circular detectada: ${error.message.replace('CYCLE_DETECTED:', '').split('->').join(' -> ')}`
  }

  if (error.message.startsWith('INVALID_DURATION:')) {
    const [, taskId, duration] = error.message.split(':')
    return `Duración inválida en tarea ${taskId}: ${duration}. Debe ser mayor o igual a 1.`
  }

  return error.message
}

function mapError(code: TaskMutationErrorCode | string): GanttMutationResult['error'] {
  const messageMap: Record<TaskMutationErrorCode, string> = {
    UNAUTHENTICATED: 'Debés iniciar sesión para editar tareas.',
    NO_PROJECT_MEMBERSHIP: 'Tu usuario no tiene membresía activa en este proyecto.',
    FORBIDDEN_OR_NOT_FOUND: 'No tenés permisos para editar esta obra.',
    VALIDATION_ERROR: 'La tarea no cumple con las reglas de validación.',
    DEPENDENCY_CYCLE: 'La dependencia crea un ciclo inválido.',
    ATOMIC_WRITE_FAILED: 'No se pudo guardar el cambio.',
    MUTATION_UNAVAILABLE: 'La edición no está disponible por una restricción de permisos del entorno (RLS).',
  }

  if (code in messageMap) {
    const typedCode = code as TaskMutationErrorCode
    return { code: typedCode, message: messageMap[typedCode] }
  }

  return { code: 'ATOMIC_WRITE_FAILED', message: code }
}

export async function mutateTask(input: MutateTaskInput): Promise<GanttMutationResult> {
  const supabase = createServerClient()
  const repo = new GanttRepo(supabase)
  const service = new GanttCrudService()

  try {
    const auth = await requireAuthContext()
    const currentSchedule = await repo.getObraSchedule({
      projectId: auth.projectId,
      obraId: input.obraId,
    })

    const command: TaskMutationCommand = input
    const preparedMutation = service.prepareTaskMutation({
      schedule: currentSchedule,
      command,
    })

    const changedTaskId = await repo.mutateTaskGraphAtomic({
      projectId: auth.projectId,
      obraId: input.obraId,
      intent: preparedMutation.intent,
      taskId: preparedMutation.taskId,
      payload: preparedMutation.payload,
    })

    const persistedSchedule = await repo.getObraSchedule({
      projectId: auth.projectId,
      obraId: input.obraId,
    })

    const schedule = createScheduleWithDetails({
      tasks: persistedSchedule.tasks,
      dependencies: service.buildCanonicalDependencies(persistedSchedule.tasks),
      obraStartDate: persistedSchedule.obra.fechaInicioGlobal,
      holidays: persistedSchedule.holidays,
      changedTaskId: input.intent === 'delete' ? undefined : changedTaskId,
    }).tasks

    return { schedule }
  } catch (error) {
    if (error instanceof TaskMutationError) {
      return { error: mapError(error.code) }
    }

    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      return { error: { code: 'UNAUTHENTICATED', message: error.message } }
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      return { error: { code: 'NO_PROJECT_MEMBERSHIP', message: error.message } }
    }

    if (error instanceof RepoAccessError) {
      return { error: { code: 'FORBIDDEN_OR_NOT_FOUND', message: error.message } }
    }

    if (error instanceof Error) {
      if (error.message.startsWith('CYCLE_DETECTED:') || error.message.startsWith('INVALID_DURATION:')) {
        return { error: { code: 'VALIDATION_ERROR', message: mapLegacySchedulerError(error) } }
      }

      // Log full error details for debugging
      console.error('[mutateTask] Unhandled error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
      })

      return { error: { code: 'ATOMIC_WRITE_FAILED', message: `No se pudo guardar el cambio: ${error.message}` } }
    }

    console.error('[mutateTask] Unknown error type:', error)
    return { error: { code: 'ATOMIC_WRITE_FAILED', message: 'No se pudo guardar el cambio.' } }
  }
}

export async function saveTaskChange(input: {
  obraId: Uuid
  taskId: Uuid
  nombre: string
  duracionDias: number
  dependeDeId: Uuid | null
}): Promise<GanttMutationResult> {
  return mutateTask({
    intent: 'update',
    obraId: input.obraId,
    taskId: input.taskId,
    nombre: input.nombre,
    duracionDias: input.duracionDias,
    dependeDeId: input.dependeDeId,
  })
}
