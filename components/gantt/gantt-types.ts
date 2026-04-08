import type { ScheduleTask, Uuid } from '@/types/gantt'

export type GanttEditorMode = 'create' | 'update' | 'delete'

export type GanttEditIntent =
  | {
      intent: 'create'
      nombre: string
      duracionDias: number
      dependeDeId: Uuid | null
    }
  | {
      intent: 'update'
      taskId: Uuid
      nombre: string
      duracionDias: number
      dependeDeId: Uuid | null
    }
  | {
      intent: 'delete'
      taskId: Uuid
    }

export type GanttMutationErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_PROJECT_MEMBERSHIP'
  | 'FORBIDDEN_OR_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DEPENDENCY_CYCLE'
  | 'ATOMIC_WRITE_FAILED'
  | 'MUTATION_UNAVAILABLE'

export interface GanttMutationError {
  code: GanttMutationErrorCode
  message: string
}

export interface GanttMutationResult {
  schedule?: ScheduleTask[]
  error?: GanttMutationError
}
