import { countWorkingDays } from '@/lib/date-engine'
import { createSchedule } from '@/lib/gantt-scheduler'
import { DEFAULT_PRINT_CONFIG, projectPrintableTasks } from '@/components/gantt/print-projection'
import type { ObraSchedule, PrintConfig, ScheduleTask } from '@/types/gantt'
import { GanttExportFooter } from './GanttExportFooter'
import { GanttExportHeader } from './GanttExportHeader'
import { GanttExportTable } from './GanttExportTable'

export type ExportScale = 'daily' | 'weekly' | 'monthly'

export interface ExportColumn {
  key: string
  label: string
  start: string
  end: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const LEFT_COLUMNS_WIDTH = 330
const ROW_HEIGHT = 30
const BASE_HEADER_HEIGHT = 136
const TABLE_HEADER_HEIGHT = 62
const FOOTER_HEIGHT = 34

const SCALE_COLUMN_WIDTH: Record<ExportScale, number> = {
  daily: 36,
  weekly: 76,
  monthly: 112,
}

function toUtcDate(input: string): Date {
  const [year, month, day] = input.split('-').map(Number)
  return new Date(Date.UTC(year as number, (month as number) - 1, day as number))
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function diffDaysInclusive(start: string, end: string): number {
  return Math.floor((toUtcDate(end).getTime() - toUtcDate(start).getTime()) / MS_PER_DAY) + 1
}

function capitalize(value: string): string {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

function resolveScale(totalDays: number): ExportScale {
  if (totalDays <= 45) {
    return 'daily'
  }
  if (totalDays <= 120) {
    return 'weekly'
  }
  return 'monthly'
}

function computeObraDateRange(schedule: ScheduleTask[]): { firstStart: string | null; lastEnd: string | null } {
  if (schedule.length === 0) {
    return { firstStart: null, lastEnd: null }
  }

  let firstStart = schedule[0]!.fechaInicio
  let lastEnd = schedule[0]!.fechaFin

  for (const task of schedule) {
    if (task.fechaInicio < firstStart) {
      firstStart = task.fechaInicio
    }
    if (task.fechaFin > lastEnd) {
      lastEnd = task.fechaFin
    }
  }

  return { firstStart, lastEnd }
}

function buildColumns(tasks: ScheduleTask[], obraStartDate: string, scale: ExportScale): ExportColumn[] {
  if (tasks.length === 0) {
    return []
  }

  const { lastEnd } = computeObraDateRange(tasks)
  if (!lastEnd) {
    return []
  }

  const totalDays = diffDaysInclusive(obraStartDate, lastEnd)

  if (scale === 'daily') {
    return Array.from({ length: totalDays }, (_, index) => {
      const date = addDays(toUtcDate(obraStartDate), index)
      const iso = toIsoDate(date)
      return {
        key: iso,
        label: iso,
        start: iso,
        end: iso,
      }
    })
  }

  if (scale === 'weekly') {
    const weekCount = Math.max(1, Math.ceil(totalDays / 5))
    return Array.from({ length: weekCount }, (_, index) => {
      const start = addDays(toUtcDate(obraStartDate), index * 5)
      const end = addDays(start, 4)
      const startIso = toIsoDate(start)
      const endIso = toIsoDate(end)
      return {
        key: `${startIso}_${index}`,
        label: `S${index + 1}`,
        start: startIso,
        end: endIso,
      }
    })
  }

  const columns: ExportColumn[] = []
  const latestEnd = toUtcDate(lastEnd)
  const obraStartUtc = toUtcDate(obraStartDate)
  const cursor = new Date(Date.UTC(obraStartUtc.getUTCFullYear(), obraStartUtc.getUTCMonth(), 1))

  while (cursor <= latestEnd) {
    const start = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1))
    const end = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0))
    columns.push({
      key: `${start.getUTCFullYear()}-${start.getUTCMonth() + 1}`,
      label: start.toLocaleDateString('es-AR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).toUpperCase(),
      start: toIsoDate(start),
      end: toIsoDate(end),
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return columns
}

function overlapDays(startA: string, endA: string, startB: string, endB: string): number {
  const start = Math.max(toUtcDate(startA).getTime(), toUtcDate(startB).getTime())
  const end = Math.min(toUtcDate(endA).getTime(), toUtcDate(endB).getTime())
  if (end < start) {
    return 0
  }
  return Math.floor((end - start) / MS_PER_DAY) + 1
}

function buildMonthGroups(columns: ExportColumn[]) {
  const groups: { monthName: string; count: number }[] = []
  let currentMonth = ''
  let currentCount = 0

  for (const column of columns) {
    const monthName = new Date(`${column.start}T00:00:00Z`)
      .toLocaleDateString('es-AR', { month: 'long', timeZone: 'UTC' })
      .toUpperCase()

    if (monthName !== currentMonth) {
      if (currentCount > 0) {
        groups.push({ monthName: currentMonth, count: currentCount })
      }
      currentMonth = monthName
      currentCount = 1
    } else {
      currentCount += 1
    }
  }

  if (currentCount > 0) {
    groups.push({ monthName: currentMonth, count: currentCount })
  }

  return groups
}

function getTaskRange(task: ScheduleTask, columns: ExportColumn[], scale: ExportScale): { startIndex: number; span: number } {
  if (columns.length === 0) {
    return { startIndex: 0, span: 0 }
  }

  if (scale === 'daily') {
    const startIndex = Math.max(0, diffDaysInclusive(columns[0]!.start, task.fechaInicio) - 1)
    const span = Math.max(1, diffDaysInclusive(task.fechaInicio, task.fechaFin))
    return { startIndex, span }
  }

  const firstMatchIndex = columns.findIndex((column) => overlapDays(task.fechaInicio, task.fechaFin, column.start, column.end) > 0)

  if (firstMatchIndex < 0) {
    return { startIndex: 0, span: 0 }
  }

  const span = columns.slice(firstMatchIndex).filter((column) => overlapDays(task.fechaInicio, task.fechaFin, column.start, column.end) > 0).length

  return {
    startIndex: firstMatchIndex,
    span: Math.max(1, span),
  }
}

export interface GanttExportSurfaceProps {
  obra: ObraSchedule
  printConfig?: PrintConfig
}

export function GanttExportSurface({ obra, printConfig = DEFAULT_PRINT_CONFIG }: GanttExportSurfaceProps) {
  const schedule = createSchedule({
    tasks: obra.tasks,
    dependencies: obra.dependencies,
    obraStartDate: obra.obra.fechaInicioGlobal,
    holidays: obra.holidays,
  })

  const printableSchedule = projectPrintableTasks({
    tasks: schedule,
    config: printConfig,
  })

  const { firstStart, lastEnd } = computeObraDateRange(printableSchedule)
  const totalObraDays = firstStart && lastEnd ? countWorkingDays(firstStart, lastEnd, obra.holidays) : 0
  const scaleMode = resolveScale(totalObraDays)
  const columns = buildColumns(printableSchedule, obra.obra.fechaInicioGlobal, scaleMode)
  const monthGroups = scaleMode === 'daily' ? buildMonthGroups(columns) : []

  const timeColumnWidth = SCALE_COLUMN_WIDTH[scaleMode]
  const exportWidth = LEFT_COLUMNS_WIDTH + columns.length * timeColumnWidth
  const exportHeight = BASE_HEADER_HEIGHT + TABLE_HEADER_HEIGHT + printableSchedule.length * ROW_HEIGHT + FOOTER_HEIGHT

  const cliente = capitalize(obra.obra.cliente?.trim() || 'Sin especificar')
  const obraNombre = capitalize(obra.obra.nombre)
  const vigencia = obra.obra.vigenciaTexto?.trim() || formatDate(obra.obra.fechaInicioGlobal)

  return (
    <div className="export-surface-wrap">
      <div
        data-export-surface="true"
        data-export-width={String(exportWidth)}
        data-export-height={String(exportHeight)}
        data-export-scale={scaleMode}
        data-obra-name={obra.obra.nombre}
        className="print-container print-export-surface"
        style={{ width: `${exportWidth}px`, minWidth: `${exportWidth}px` }}
      >
        <GanttExportHeader
          obraNombre={obraNombre}
          cliente={cliente}
          vigencia={vigencia}
          totalObraDays={totalObraDays}
          scaleMode={scaleMode}
          firstStart={firstStart}
          lastEnd={lastEnd}
        />

        <GanttExportTable
          scaleMode={scaleMode}
          columns={columns}
          monthGroups={monthGroups}
          tasks={printableSchedule}
          getTaskRange={(task) => getTaskRange(task, columns, scaleMode)}
          taskColumnWidth={timeColumnWidth}
        />

        <GanttExportFooter exportDate={new Date().toLocaleDateString('es-AR')} />
      </div>
    </div>
  )
}
