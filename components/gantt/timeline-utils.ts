import type { IsoDate, ScheduleTask } from '@/types/gantt'

export type TimelineScale = 'daily' | 'weekly'

/**
 * Canonical boundary contract shared by interactive + print views:
 * - span < 60  => daily
 * - span >= 60 => weekly
 */
export const WEEKLY_TIMELINE_THRESHOLD_DAYS = 60

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function toUtcDate(input: IsoDate): Date {
  const [year, month, day] = input.split('-').map(Number)
  return new Date(Date.UTC(year as number, (month as number) - 1, day as number))
}

export function formatIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10) as IsoDate
}

export function addUtcDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

export function diffUtcDays(start: IsoDate, end: IsoDate): number {
  return Math.floor((toUtcDate(end).getTime() - toUtcDate(start).getTime()) / DAY_IN_MS)
}

export function diffUtcDaysInclusive(start: IsoDate, end: IsoDate): number {
  return diffUtcDays(start, end) + 1
}

export function calculateProjectSpanDays(tasks: ScheduleTask[], obraStartDate: IsoDate): number {
  if (tasks.length === 0) {
    return 7
  }

  const latestEnd = tasks.reduce<IsoDate>((current, task) => {
    return task.fechaFin > current ? task.fechaFin : current
  }, obraStartDate)

  return diffUtcDaysInclusive(obraStartDate, latestEnd)
}

export function deriveTimelineScale(tasks: ScheduleTask[], obraStartDate: IsoDate): TimelineScale {
  return calculateProjectSpanDays(tasks, obraStartDate) < WEEKLY_TIMELINE_THRESHOLD_DAYS
    ? 'daily'
    : 'weekly'
}

export interface TimelineColumn {
  key: string
  label: string
  start: IsoDate
  end: IsoDate
}

export function buildTimelineColumns(params: {
  tasks: ScheduleTask[]
  obraStartDate: IsoDate
  scale: TimelineScale
}): TimelineColumn[] {
  const { tasks, obraStartDate, scale } = params
  const spanDays = calculateProjectSpanDays(tasks, obraStartDate)

  if (scale === 'daily') {
    return Array.from({ length: spanDays }, (_, index) => {
      const date = addUtcDays(toUtcDate(obraStartDate), index)
      const label = date.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        timeZone: 'UTC',
      })

      return {
        key: formatIsoDate(date),
        label,
        start: formatIsoDate(date),
        end: formatIsoDate(date),
      }
    })
  }

  const weekCount = Math.max(1, Math.ceil(spanDays / 5))
  return Array.from({ length: weekCount }, (_, index) => {
    const start = addUtcDays(toUtcDate(obraStartDate), index * 5)
    const end = addUtcDays(start, 4)
    return {
      key: `${formatIsoDate(start)}_${index}`,
      label: `${formatIsoDate(start)} → ${formatIsoDate(end)}`,
      start: formatIsoDate(start),
      end: formatIsoDate(end),
    }
  })
}

export function getTaskTimelineRange(params: {
  task: ScheduleTask
  obraStartDate: IsoDate
  scale: TimelineScale
}): { startIndex: number; span: number } {
  const { task, obraStartDate, scale } = params
  const offsetDays = diffUtcDaysInclusive(obraStartDate, task.fechaInicio) - 1
  const durationDays = diffUtcDaysInclusive(task.fechaInicio, task.fechaFin)

  if (scale === 'daily') {
    return {
      startIndex: Math.max(0, offsetDays),
      span: Math.max(1, durationDays),
    }
  }

  return {
    startIndex: Math.max(0, Math.floor(offsetDays / 5)),
    span: Math.max(1, Math.ceil(durationDays / 5)),
  }
}
