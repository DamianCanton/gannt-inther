import type { ScheduleTask, Uuid } from '@/types/gantt'

export interface InteractiveHierarchyRow {
  task: ScheduleTask
  depth: 0 | 1
  hasChildren: boolean
  isCollapsed: boolean
}

function sortForInteractiveView(tasks: ScheduleTask[]): ScheduleTask[] {
  return [...tasks].sort((left, right) => {
    const dateCompare = left.fechaInicio.localeCompare(right.fechaInicio)
    if (dateCompare !== 0) {
      return dateCompare
    }

    const orderCompare = left.orden - right.orden
    if (orderCompare !== 0) {
      return orderCompare
    }

    return left.id.localeCompare(right.id)
  })
}

export function getHierarchyParentIds(tasks: ScheduleTask[]): Set<Uuid> {
  void tasks
  return new Set<Uuid>()
}

export function flattenHierarchyForInteractive(
  tasks: ScheduleTask[],
  collapsedParentIds: ReadonlySet<Uuid>
): InteractiveHierarchyRow[] {
  void collapsedParentIds

  return sortForInteractiveView(tasks).map((task) => ({
    task,
    depth: 0,
    hasChildren: false,
    isCollapsed: false,
  }))
}
