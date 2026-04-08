import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PrintTimelineTable } from '@/components/gantt/print-timeline-table'
import { createSchedule } from '@/lib/gantt-scheduler'
import {
  buildTimelineColumns,
  deriveTimelineScale,
} from '@/components/gantt/timeline-utils'
import type { ObraSchedule, ScheduleTask } from '@/types/gantt'

const repoLikeSchedule: ObraSchedule = {
  obra: {
    id: 'o1',
    projectId: 'p1',
    nombre: 'Obra Integración',
    cliente: null,
    tipoObra: 'Tipo A',
    fechaInicioGlobal: '2026-04-06',
    vigenciaTexto: null,
  },
  tasks: [
    {
      id: 'A',
      projectId: 'p1',
      obraId: 'o1',
      nombre: 'A',
      duracionDias: 2,
      dependeDeId: 'C',
      orden: 1,
    },
    {
      id: 'B',
      projectId: 'p1',
      obraId: 'o1',
      nombre: 'B',
      duracionDias: 2,
      dependeDeId: 'A',
      orden: 2,
    },
    {
      id: 'C',
      projectId: 'p1',
      obraId: 'o1',
      nombre: 'C',
      duracionDias: 1,
      dependeDeId: 'B',
      orden: 3,
    },
  ],
  dependencies: [
    { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
    { taskId: 'C', dependsOnTaskId: 'B', kind: 'FS' },
  ],
  holidays: new Set(),
}

describe('schedule mapping integration', () => {
  it('uses canonical dependencies from repository over legacy dependeDeId', () => {
    const schedule = createSchedule({
      tasks: repoLikeSchedule.tasks,
      dependencies: repoLikeSchedule.dependencies,
      obraStartDate: repoLikeSchedule.obra.fechaInicioGlobal,
      holidays: repoLikeSchedule.holidays,
    })

    expect(schedule.map((task) => task.id)).toEqual(['A', 'B', 'C'])
  })

  it('keeps print timeline rendering path functional', () => {
    render(<PrintTimelineTable obra={repoLikeSchedule} />)

    expect(screen.getByText('Obra Integración')).toBeTruthy()
    expect(screen.getByText('Escala: Diaria')).toBeTruthy()
  })

  it('reuses shared timeline contract daily/weekly boundaries for print parity', () => {
    const dailySchedule: ScheduleTask[] = [
      {
        id: 'D1',
        projectId: 'p1',
        obraId: 'o1',
        nombre: 'Corto',
        duracionDias: 59,
        dependeDeId: null,
        orden: 1,
        fechaInicio: '2026-04-06',
        fechaFin: '2026-06-03',
      },
    ]

    const weeklySchedule: ScheduleTask[] = [
      {
        id: 'W1',
        projectId: 'p1',
        obraId: 'o1',
        nombre: 'Largo',
        duracionDias: 60,
        dependeDeId: null,
        orden: 1,
        fechaInicio: '2026-04-06',
        fechaFin: '2026-06-04',
      },
    ]

    const dailyScale = deriveTimelineScale(dailySchedule, repoLikeSchedule.obra.fechaInicioGlobal)
    const weeklyScale = deriveTimelineScale(weeklySchedule, repoLikeSchedule.obra.fechaInicioGlobal)

    expect(dailyScale).toBe('daily')
    expect(weeklyScale).toBe('weekly')

    const weeklyColumns = buildTimelineColumns({
      tasks: weeklySchedule,
      obraStartDate: repoLikeSchedule.obra.fechaInicioGlobal,
      scale: weeklyScale,
    })

    expect(weeklyColumns[0]).toMatchObject({
      start: '2026-04-06',
      end: '2026-04-10',
    })
  })

  it('shows explicit print empty state when no schedule rows exist', () => {
    render(
      <PrintTimelineTable
        obra={{
          ...repoLikeSchedule,
          tasks: [],
          dependencies: [],
        }}
      />
    )

    expect(screen.getByText('No hay tareas imprimibles para esta obra.')).toBeTruthy()
  })
})
