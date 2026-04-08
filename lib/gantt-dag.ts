import {
  addWorkingDays,
  nextWorkingDay,
  toUtcDateOnly,
} from '@/lib/date-engine'
import type {
  RecalculateParams,
  RecalculateResult,
  ScheduleTask,
  TaskDependency,
  TaskInput,
  Uuid,
} from '@/types/gantt'

const DAY_MS = 24 * 60 * 60 * 1000

export interface GraphData {
  adjacency: Map<string, string[]>
  inDegree: Map<string, number>
}

function toIsoDate(date: Date): `${number}-${number}-${number}` {
  return date.toISOString().slice(0, 10) as `${number}-${number}-${number}`
}

function compareTaskIdsByOrder(taskOrder: Map<string, number>, leftId: string, rightId: string): number {
  const leftOrder = taskOrder.get(leftId) ?? Number.MAX_SAFE_INTEGER
  const rightOrder = taskOrder.get(rightId) ?? Number.MAX_SAFE_INTEGER
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder
  }

  return leftId.localeCompare(rightId)
}

function buildPredecessorMap(
  tasks: Array<Pick<TaskInput, 'id' | 'dependeDeId'>>,
  dependencies: TaskDependency[] = []
): Map<string, string[]> {
  const predecessorsByTask = new Map<string, string[]>()
  const taskIds = new Set(tasks.map((task) => task.id))

  for (const task of tasks) {
    predecessorsByTask.set(task.id, [])
  }

  if (dependencies.length > 0) {
    for (const dependency of dependencies) {
      if (dependency.kind !== 'FS') {
        continue
      }

      if (!taskIds.has(dependency.taskId)) {
        throw new Error(`Dependency references unknown task: ${dependency.taskId}`)
      }

      if (!taskIds.has(dependency.dependsOnTaskId)) {
        throw new Error(`Dependency references unknown task: ${dependency.dependsOnTaskId}`)
      }

      predecessorsByTask.get(dependency.taskId)?.push(dependency.dependsOnTaskId)
    }

    for (const [taskId, predecessorIds] of predecessorsByTask.entries()) {
      predecessorsByTask.set(taskId, Array.from(new Set(predecessorIds)))
    }

    return predecessorsByTask
  }

  for (const task of tasks) {
    if (!task.dependeDeId) {
      continue
    }

    if (!taskIds.has(task.dependeDeId)) {
      throw new Error(`Dependency references unknown task: ${task.dependeDeId}`)
    }

    predecessorsByTask.set(task.id, [task.dependeDeId])
  }

  return predecessorsByTask
}

export function buildGraph(
  tasks: Array<Pick<TaskInput, 'id' | 'dependeDeId' | 'orden'>>,
  dependencies: TaskDependency[] = []
): GraphData {
  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  const taskOrder = new Map(tasks.map((task) => [task.id, task.orden]))
  const predecessorsByTask = buildPredecessorMap(tasks, dependencies)

  for (const task of tasks) {
    adjacency.set(task.id, [])
    inDegree.set(task.id, 0)
  }

  for (const [taskId, predecessorIds] of predecessorsByTask.entries()) {
    for (const predecessorId of predecessorIds) {
      adjacency.get(predecessorId)?.push(taskId)
      inDegree.set(taskId, (inDegree.get(taskId) ?? 0) + 1)
    }
  }

  for (const [taskId, successors] of adjacency.entries()) {
    successors.sort((leftId, rightId) => compareTaskIdsByOrder(taskOrder, leftId, rightId))
    adjacency.set(taskId, successors)
  }

  return { adjacency, inDegree }
}

/**
 * Resolve task dependencies using topological sort.
 * 
 * Calculates start_date and end_date for all tasks based on:
 * - Project start date
 * - Task durations (in working days)
 * - Task dependencies (predecessor tasks)
 * - Holidays (dates to skip)
 * 
 * @param projectStartDate - Project start date (ISO format string or Date object)
 * @param tasks - Array of tasks with durations and dependencies
 * @param holidays - Set of holiday dates in ISO format (YYYY-MM-DD)
 * @returns Tasks with calculated start_date and end_date
 * @throws Error if circular dependency detected or not implemented
 * 
 * @example
 * const tasks = [
 *   { id: '1', duration: 5, dependencies: [] },
 *   { id: '2', duration: 3, dependencies: [{ predecessor_id: '1', type: 'FS' }] }
 * ]
 * const resolved = resolveDependencies(new Date('2024-01-01'), tasks, new Set())
 * // Task 1: starts 2024-01-01, ends 2024-01-05
 * // Task 2: starts 2024-01-08 (after Task 1), ends 2024-01-10
 * 
 * // TODO: Implement in Phase 2
 */
export function resolveDependencies(
  projectStartDate: Date | string,
  tasks: TaskInput[],
  holidays: ReadonlySet<string>,
  dependencies: TaskDependency[] = []
): ScheduleTask[] {
  const sorted = topologicalSort(tasks, dependencies)
  const scheduled = new Map<string, ScheduleTask>()
  const predecessorsByTask = buildPredecessorMap(tasks, dependencies)

  for (const task of sorted) {
    if (task.duracionDias < 1) {
      throw new Error(`INVALID_DURATION:${task.id}:${task.duracionDias}`)
    }

    const predecessorIds = predecessorsByTask.get(task.id) ?? []
    const rawStart = predecessorIds.length > 0
      ? new Date(
          Math.max(
            ...predecessorIds.map((predecessorId) => {
              const predecessor = scheduled.get(predecessorId)
              if (!predecessor) {
                throw new Error(`Predecessor not scheduled: ${predecessorId}`)
              }
              return toUtcDateOnly(predecessor.fechaFin).getTime()
            })
          ) + DAY_MS
        )
      : toUtcDateOnly(projectStartDate)

    const start = nextWorkingDay(rawStart, holidays)
    const end = addWorkingDays(start, task.duracionDias, holidays)

    scheduled.set(task.id, {
      ...task,
      fechaInicio: toIsoDate(start),
      fechaFin: toIsoDate(end),
    })
  }

  return sorted.map((task) => {
    const result = scheduled.get(task.id)
    if (!result) {
      throw new Error(`Unable to schedule task ${task.id}`)
    }
    return result
  })
}

/**
 * Detect circular dependencies in task graph.
 * 
 * A circular dependency occurs when Task A depends on Task B,
 * and Task B (directly or indirectly) depends on Task A.
 * 
 * @param tasks - Array of tasks with dependencies
 * @returns Array of task IDs involved in cycle, or empty array if no cycle
 * @throws Error if not implemented
 * 
 * @example
 * const tasks = [
 *   { id: '1', dependencies: [{ predecessor_id: '2', type: 'FS' }] },
 *   { id: '2', dependencies: [{ predecessor_id: '1', type: 'FS' }] }
 * ]
 * detectCycle(tasks) // Returns ['1', '2'] (circular)
 * 
 * // TODO: Implement in Phase 2
 */
export function detectCycle(tasks: Array<Pick<TaskInput, 'id' | 'dependeDeId'>>): string[] {
  return detectCycleWithDependencies(tasks, [])
}

function detectCycleWithDependencies(
  tasks: Array<Pick<TaskInput, 'id' | 'dependeDeId'> & Partial<Pick<TaskInput, 'orden'>>>,
  dependencies: TaskDependency[]
): string[] {
  const orderedTasks = tasks.map((task, index) => ({
    ...task,
    orden: task.orden ?? index,
  }))
  const { adjacency } = buildGraph(orderedTasks, dependencies)
  const taskOrder = new Map(orderedTasks.map((task) => [task.id, task.orden]))
  const nodeIds = [...adjacency.keys()].sort((leftId, rightId) =>
    compareTaskIdsByOrder(taskOrder, leftId, rightId)
  )
  const state = new Map<string, 0 | 1 | 2>()
  const parent = new Map<string, string | null>()

  const visit = (nodeId: string): string[] => {
    state.set(nodeId, 1)

    const neighbors = adjacency.get(nodeId) ?? []
    for (const neighborId of neighbors) {
      const neighborState = state.get(neighborId) ?? 0
      if (neighborState === 0) {
        parent.set(neighborId, nodeId)
        const cycle = visit(neighborId)
        if (cycle.length > 0) {
          return cycle
        }
      }

      if (neighborState === 1) {
        const chain = [nodeId]
        while (chain.at(-1) !== neighborId) {
          const current = chain.at(-1)
          if (!current) {
            break
          }

          const previous = parent.get(current)
          if (!previous) {
            break
          }
          chain.push(previous)
        }

        const orderedChain = chain.reverse()
        return [...orderedChain, neighborId]
      }
    }

    state.set(nodeId, 2)
    return []
  }

  for (const nodeId of nodeIds) {
    if ((state.get(nodeId) ?? 0) !== 0) {
      continue
    }

    parent.set(nodeId, null)
    const cycle = visit(nodeId)
    if (cycle.length > 0) {
      return cycle
    }
  }

  return []
}

/**
 * Get tasks in topological order (respecting dependencies).
 * 
 * Returns tasks sorted so that all predecessor tasks appear
 * before their dependent tasks.
 * 
 * @param tasks - Array of tasks with dependencies
 * @returns Tasks sorted in dependency order
 * @throws Error if circular dependency exists or not implemented
 * 
 * @example
 * const tasks = [
 *   { id: '2', dependencies: [{ predecessor_id: '1', type: 'FS' }] },
 *   { id: '1', dependencies: [] }
 * ]
 * topologicalSort(tasks) // Returns [task1, task2] (sorted order)
 * 
 * // TODO: Implement in Phase 2
 */
export function topologicalSort<TTask extends Pick<TaskInput, 'id' | 'dependeDeId' | 'orden'>>(
  tasks: TTask[],
  dependencies: TaskDependency[] = []
): TTask[] {
  const cycle = detectCycleWithDependencies(tasks, dependencies)
  if (cycle.length > 0) {
    throw new Error(`Cycle detected: ${cycle.join(' -> ')}`)
  }

  const { adjacency, inDegree } = buildGraph(tasks, dependencies)
  const taskOrder = new Map(tasks.map((task) => [task.id, task.orden]))
  const queue: string[] = []
  for (const task of tasks) {
    if ((inDegree.get(task.id) ?? 0) === 0) {
      queue.push(task.id)
    }
  }
  queue.sort((leftId, rightId) => compareTaskIdsByOrder(taskOrder, leftId, rightId))

  const byId = new Map(tasks.map((task) => [task.id, task]))
  const result: TTask[] = []

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) {
      break
    }

    const task = byId.get(currentId)
    if (task) {
      result.push(task)
    }

    const dependents = adjacency.get(currentId) ?? []
    for (const dependentId of dependents) {
      const nextInDegree = (inDegree.get(dependentId) ?? 0) - 1
      inDegree.set(dependentId, nextInDegree)
      if (nextInDegree === 0) {
        queue.push(dependentId)
        queue.sort((leftId, rightId) => compareTaskIdsByOrder(taskOrder, leftId, rightId))
      }
    }
  }

  if (result.length !== tasks.length) {
    throw new Error('Graph resolution failed: unresolved nodes remain')
  }

  return result
}

export function recalculateCascade(params: RecalculateParams): ScheduleTask[] {
  return recalculateCascadeWithDetails(params).tasks
}

export function recalculateCascadeWithDetails(params: RecalculateParams): RecalculateResult {
  const cycle = detectCycleWithDependencies(params.tasks, params.dependencies)
  if (cycle.length > 0) {
    throw new Error(`CYCLE_DETECTED:${cycle.join('->')}`)
  }

  const tasks = resolveDependencies(
    params.obraStartDate,
    params.tasks,
    params.holidays,
    params.dependencies
  )

  if (!params.changedTaskId) {
    return { tasks }
  }

  const { adjacency } = buildGraph(params.tasks, params.dependencies)
  const changedTaskIds = collectChangedTaskIds(params.changedTaskId, adjacency)
  return {
    tasks,
    changedTaskIds,
  }
}

function collectChangedTaskIds(changedTaskId: Uuid, adjacency: Map<string, string[]>): Uuid[] {
  if (!adjacency.has(changedTaskId)) {
    return []
  }

  const visited = new Set<string>()
  const queue: string[] = [changedTaskId]

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId || visited.has(currentId)) {
      continue
    }

    visited.add(currentId)
    for (const dependentId of adjacency.get(currentId) ?? []) {
      if (!visited.has(dependentId)) {
        queue.push(dependentId)
      }
    }
  }

  return [...visited]
}
