import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ScheduleTask } from '@/types/gantt'
import { GanttGrid } from '@/components/gantt/gantt-grid'

function makeTask(overrides: Partial<ScheduleTask>): ScheduleTask {
  return {
    id: overrides.id ?? 'T1',
    projectId: overrides.projectId ?? 'p1',
    obraId: overrides.obraId ?? 'o1',
    nombre: overrides.nombre ?? 'Tarea',
    duracionDias: overrides.duracionDias ?? 3,
    dependeDeId: overrides.dependeDeId ?? null,
    orden: overrides.orden ?? 1,
    fechaInicio: overrides.fechaInicio ?? '2026-04-06',
    fechaFin: overrides.fechaFin ?? '2026-04-08',
  }
}

describe('GanttGrid dependencies contract', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders dependency line when both source and target tasks are visible', () => {
    render(
      <GanttGrid
        tasks={[
          makeTask({ id: 'A1', nombre: 'Fundaciones', orden: 1, fechaInicio: '2026-04-06', fechaFin: '2026-04-08' }),
          makeTask({ id: 'B1', nombre: 'Estructura', dependeDeId: 'A1', orden: 2, fechaInicio: '2026-04-09', fechaFin: '2026-04-12' }),
        ]}
        obraStartDate="2026-04-06"
        selectedTaskId={null}
        onSelectTask={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Dependencia Fundaciones → Estructura')).toBeTruthy()
  })

  it('does not render dependency line when the source task is filtered out', () => {
    render(
      <GanttGrid
        tasks={[
          makeTask({ id: 'B1', nombre: 'Estructura', dependeDeId: 'A1', orden: 2, fechaInicio: '2026-04-09', fechaFin: '2026-04-12' }),
        ]}
        obraStartDate="2026-04-06"
        selectedTaskId={null}
        onSelectTask={vi.fn()}
      />
    )

    expect(screen.queryByLabelText('Dependencia Fundaciones → Estructura')).toBeNull()
  })
})
