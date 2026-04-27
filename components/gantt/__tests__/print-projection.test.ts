import { describe, expect, it } from 'vitest'

import type { PrintConfig, ScheduleTask } from '@/types/gantt'
import {
  DEFAULT_PRINT_CONFIG,
  deserializePrintConfig,
  projectPrintableTasks,
  serializePrintConfig,
} from '@/components/gantt/print-projection'

const schedule: ScheduleTask[] = [
  {
    id: 'P1',
    projectId: 'p1',
    obraId: 'o1',
    nombre: 'Padre visible',
    duracionDias: 3,
    dependeDeId: null,
    orden: 1,
    fechaInicio: '2026-04-06',
    fechaFin: '2026-04-08',
  },
  {
    id: 'C1',
    projectId: 'p1',
    obraId: 'o1',
    nombre: 'Subtarea visible',
    duracionDias: 2,
    dependeDeId: null,
    orden: 2,
    fechaInicio: '2026-04-07',
    fechaFin: '2026-04-08',
  },
  {
    id: 'S1',
    projectId: 'p1',
    obraId: 'o1',
    nombre: 'Tarea de 1 día',
    duracionDias: 1,
    dependeDeId: null,
    orden: 3,
    fechaInicio: '2026-04-09',
    fechaFin: '2026-04-09',
  },
]

function makeConfig(overrides: Partial<PrintConfig>): PrintConfig {
  return {
    ...DEFAULT_PRINT_CONFIG,
    visibleTaskIds: ['P1', 'C1', 'S1'],
    ...overrides,
  }
}

describe('print projection helpers', () => {
  it('serializes and deserializes explicit PrintConfig shape', () => {
    const config = makeConfig({
      selectionMode: 'manual',
      includeOneDayTasks: false,
      expandAllBeforePrint: true,
      manualTaskIds: ['P1'],
    })

    const encoded = serializePrintConfig(config)
    const decoded = deserializePrintConfig(encoded)

    expect(decoded).toEqual(config)
  })

  it('prints only the visible crop by default', () => {
    const projected = projectPrintableTasks({
      tasks: schedule,
      config: makeConfig({ visibleTaskIds: ['P1'] }),
    })

    expect(projected.map((task) => task.id)).toEqual(['P1'])
  })

  it('keeps selected tasks in flat projection', () => {
    const projected = projectPrintableTasks({
      tasks: schedule,
      config: makeConfig({
        visibleTaskIds: ['P1', 'C1'],
      }),
    })

    expect(projected.map((task) => task.id)).toEqual(['P1', 'C1'])
  })

  it('includes or excludes one-day tasks based on config', () => {
    const includeOneDay = projectPrintableTasks({
      tasks: schedule,
      config: makeConfig({ includeOneDayTasks: true }),
    })

    const excludeOneDay = projectPrintableTasks({
      tasks: schedule,
      config: makeConfig({ includeOneDayTasks: false }),
    })

    expect(includeOneDay.some((task) => task.id === 'S1')).toBe(true)
    expect(excludeOneDay.some((task) => task.id === 'S1')).toBe(false)
  })

  it('uses manual task selection when mode is manual', () => {
    const projected = projectPrintableTasks({
      tasks: schedule,
      config: makeConfig({
        selectionMode: 'manual',
        visibleTaskIds: ['P1', 'C1', 'S1'],
        manualTaskIds: ['C1'],
      }),
    })

    expect(projected.map((task) => task.id)).toEqual(['C1'])
  })
})
