import type { PrintConfig, ScheduleTask, Uuid } from '@/types/gantt'

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  selectionMode: 'visible',
  includeOneDayTasks: true,
  expandAllBeforePrint: false,
  visibleTaskIds: [],
  manualTaskIds: [],
}

function isUuidArray(value: unknown): value is Uuid[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function normalizePrintConfig(value: unknown): PrintConfig {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PRINT_CONFIG
  }

  const raw = value as Partial<PrintConfig>

  return {
    selectionMode: raw.selectionMode === 'manual' ? 'manual' : 'visible',
    includeOneDayTasks: raw.includeOneDayTasks !== false,
    expandAllBeforePrint: raw.expandAllBeforePrint === true,
    visibleTaskIds: isUuidArray(raw.visibleTaskIds) ? raw.visibleTaskIds : [],
    manualTaskIds: isUuidArray(raw.manualTaskIds) ? raw.manualTaskIds : [],
  }
}

export function serializePrintConfig(config: PrintConfig): string {
  return JSON.stringify(config)
}

export function deserializePrintConfig(rawConfig?: string | null): PrintConfig {
  if (!rawConfig) {
    return DEFAULT_PRINT_CONFIG
  }

  try {
    return normalizePrintConfig(JSON.parse(rawConfig))
  } catch {
    return DEFAULT_PRINT_CONFIG
  }
}

export function projectPrintableTasks(params: {
  tasks: ScheduleTask[]
  config: PrintConfig
}): ScheduleTask[] {
  const { tasks, config } = params

  const selectedIds =
    config.selectionMode === 'manual'
      ? new Set(config.manualTaskIds)
      : new Set(config.visibleTaskIds)

  const hasSelectedIds = selectedIds.size > 0

  return tasks.filter((task) => {
    const includedBySelection = hasSelectedIds ? selectedIds.has(task.id) : true

    if (!includedBySelection) {
      return false
    }

    if (!config.includeOneDayTasks && task.duracionDias <= 1) {
      return false
    }

    return true
  })
}
