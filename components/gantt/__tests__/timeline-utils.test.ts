import { describe, expect, it } from 'vitest'

import {
  buildTimelineColumns,
  deriveTimelineScale,
} from '@/components/gantt/timeline-utils'
import type { ScheduleTask } from '@/types/gantt'

function makeTask(params: {
  id: string
  start: string
  end: string
  duration: number
  order: number
}): ScheduleTask {
  return {
    id: params.id,
    projectId: 'p1',
    obraId: 'o1',
    nombre: `Task ${params.id}`,
    duracionDias: params.duration,
    dependeDeId: null,
    orden: params.order,
    fechaInicio: params.start as `${number}-${number}-${number}`,
    fechaFin: params.end as `${number}-${number}-${number}`,
  }
}

describe('timeline-utils shared contract', () => {
  it('uses daily scale for 59 day spans', () => {
    const tasks = [
      makeTask({ id: 'T1', start: '2026-04-06', end: '2026-06-03', duration: 59, order: 1 }),
    ]

    const scale = deriveTimelineScale(tasks, '2026-04-06')
    const columns = buildTimelineColumns({
      tasks,
      obraStartDate: '2026-04-06',
      scale,
    })

    expect(scale).toBe('daily')
    expect(columns).toHaveLength(59)
  })

  it('uses weekly scale for 60 day spans', () => {
    const tasks = [
      makeTask({ id: 'T1', start: '2026-04-06', end: '2026-06-04', duration: 60, order: 1 }),
    ]

    const scale = deriveTimelineScale(tasks, '2026-04-06')
    const columns = buildTimelineColumns({
      tasks,
      obraStartDate: '2026-04-06',
      scale,
    })

    expect(scale).toBe('weekly')
    expect(columns).toHaveLength(12)
  })

  it('aligns weekly columns in 5-day groups from obra start date', () => {
    const tasks = [
      makeTask({ id: 'T1', start: '2026-04-06', end: '2026-06-04', duration: 60, order: 1 }),
    ]

    const columns = buildTimelineColumns({
      tasks,
      obraStartDate: '2026-04-06',
      scale: 'weekly',
    })

    expect(columns[0]).toMatchObject({
      start: '2026-04-06',
      end: '2026-04-10',
    })
    expect(columns[1]).toMatchObject({
      start: '2026-04-11',
      end: '2026-04-15',
    })
  })
})
