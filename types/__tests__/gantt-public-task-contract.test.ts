import { describe, expect, it } from 'vitest'

import type { PrintConfig, PrintTaskPayload, TaskInput } from '../gantt'

describe('gantt public task contracts', () => {
  it('keeps TaskInput flat (no hierarchy fields)', () => {
    const task: TaskInput = {
      id: 't-1',
      projectId: 'p-1',
      obraId: 'o-1',
      nombre: 'Tarea base',
      duracionDias: 3,
      dependeDeId: null,
      orden: 1,
    }

    expect(task.dependeDeId).toBeNull()

    // @ts-expect-error parentId was removed from public TaskInput
    const _invalidParent: TaskInput = { ...task, parentId: null }
    // @ts-expect-error offsetDias was removed from public TaskInput
    const _invalidOffset: TaskInput = { ...task, offsetDias: 2 }

    expect(task.orden).toBe(1)
  })

  it('removes hierarchy-only print contract fields', () => {
    const printConfig: PrintConfig = {
      selectionMode: 'visible',
      includeOneDayTasks: true,
      expandAllBeforePrint: false,
      visibleTaskIds: ['t-1'],
      manualTaskIds: [],
    }

    const payload: PrintTaskPayload = {
      id: 't-1',
      nombre: 'Tarea base',
      duracionDias: 3,
      fechaInicio: '2026-01-01',
      fechaFin: '2026-01-03',
    }

    // @ts-expect-error includeVisibleSubtasks was removed from PrintConfig
    const _invalidConfig: PrintConfig = { ...printConfig, includeVisibleSubtasks: true }
    // @ts-expect-error parentId was removed from PrintTaskPayload
    const _invalidPayloadParent: PrintTaskPayload = { ...payload, parentId: null }
    // @ts-expect-error offsetDias was removed from PrintTaskPayload
    const _invalidPayloadOffset: PrintTaskPayload = { ...payload, offsetDias: 1 }

    expect(payload.duracionDias).toBeGreaterThan(0)
  })
})
