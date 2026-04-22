import type { ScheduleTask, Uuid } from '@/types/gantt'
import type { SmartInsertStrategy } from '@/components/gantt/gantt-types'

export interface SmartInsertConflict {
  parentId: Uuid
  parentName: string
  childId: Uuid
  childName: string
}

/**
 * Detects if the given parent task already has a dependent child.
 * Returns the conflict details needed to present the Insert vs Branch choice.
 */
export function detectSmartInsertConflict(params: {
  parentId: Uuid
  tasks: ScheduleTask[]
  excludeTaskId?: Uuid
}): SmartInsertConflict | null {
  const { parentId, tasks, excludeTaskId } = params

  const parent = tasks.find((t) => t.id === parentId)
  if (!parent) {
    return null
  }

  // Find the first child that depends on this parent
  // (excluding the task being edited, if applicable)
  const child = tasks.find(
    (t) => t.dependeDeId === parentId && t.id !== excludeTaskId
  )

  if (!child) {
    return null
  }

  return {
    parentId: parent.id,
    parentName: parent.nombre,
    childId: child.id,
    childName: child.nombre,
  }
}

/**
 * Validates a smart insert strategy.
 * Returns an error message if invalid, or null if valid.
 */
export function validateSmartInsertStrategy(
  strategy: SmartInsertStrategy
): string | null {
  if (strategy !== 'insert' && strategy !== 'branch') {
    return 'Estrategia de inserción inválida.'
  }
  return null
}
