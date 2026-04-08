import { recalculateCascade, recalculateCascadeWithDetails } from '@/lib/gantt-dag'
import type { RecalculateParams, RecalculateResult, ScheduleTask, TaskInput, Uuid } from '@/types/gantt'

export interface TaskPatch {
  taskId: Uuid
  nombre?: string
  duracionDias?: number
  dependeDeId?: Uuid | null
}

export function applyTaskPatch(tasks: TaskInput[], patch: TaskPatch): TaskInput[] {
  return tasks.map((task) => {
    if (task.id !== patch.taskId) {
      return task
    }

    return {
      ...task,
      nombre: patch.nombre ?? task.nombre,
      duracionDias: patch.duracionDias ?? task.duracionDias,
      dependeDeId: patch.dependeDeId === undefined ? task.dependeDeId : patch.dependeDeId,
    }
  })
}

export function createSchedule(params: RecalculateParams): ScheduleTask[] {
  return recalculateCascade(params)
}

export function createScheduleWithDetails(params: RecalculateParams): RecalculateResult {
  return recalculateCascadeWithDetails(params)
}
