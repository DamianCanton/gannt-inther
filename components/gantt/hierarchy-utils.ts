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
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const parentIds = new Set<Uuid>()

  for (const task of tasks) {
    const parentId = task.parentId ?? null
    if (parentId === null) {
      continue
    }

    const parentTask = taskById.get(parentId)
    if (parentTask) {
      parentIds.add(parentId)
    }
  }

  return parentIds
}

export function flattenHierarchyForInteractive(
  tasks: ScheduleTask[],
  collapsedParentIds: ReadonlySet<Uuid>
): InteractiveHierarchyRow[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const childrenByParent = new Map<Uuid, ScheduleTask[]>()
  const topLevelTasks: ScheduleTask[] = []

  for (const task of sortForInteractiveView(tasks)) {
    const parentId = task.parentId ?? null

    if (parentId === null) {
      topLevelTasks.push(task)
      continue
    }

    const parentTask = taskById.get(parentId)
    if (!parentTask || (parentTask.parentId ?? null) !== null) {
      topLevelTasks.push({ ...task, parentId: null, offsetDias: 0 })
      continue
    }

    const currentChildren = childrenByParent.get(parentId) ?? []
    currentChildren.push(task)
    childrenByParent.set(parentId, currentChildren)
  }

  const rows: InteractiveHierarchyRow[] = []

  for (const parentTask of topLevelTasks) {
    const children = sortForInteractiveView(childrenByParent.get(parentTask.id) ?? [])
    const hasChildren = children.length > 0
    const isCollapsed = hasChildren && collapsedParentIds.has(parentTask.id)

    rows.push({
      task: parentTask,
      depth: 0,
      hasChildren,
      isCollapsed,
    })

    if (isCollapsed) {
      continue
    }

    for (const childTask of children) {
      rows.push({
        task: childTask,
        depth: 1,
        hasChildren: false,
        isCollapsed: false,
      })
    }
  }

  return rows
}
