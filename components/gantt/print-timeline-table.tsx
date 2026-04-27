/* eslint-disable @next/next/no-img-element */
/* Print view needs raw <img> for @media print reliability */
import { isWeekend, countWorkingDays } from '@/lib/date-engine'
import { createSchedule } from '@/lib/gantt-scheduler'
import {
  buildTimelineColumns,
  deriveTimelineScale,
  getTaskTimelineRange,
  type TimelineScale,
} from '@/components/gantt/timeline-utils'
import { DEFAULT_PRINT_CONFIG, projectPrintableTasks } from '@/components/gantt/print-projection'
import type { ObraSchedule, IsoDate, PrintConfig, ScheduleTask } from '@/types/gantt'

export interface PrintTimelineTableProps {
  obra: ObraSchedule
  printConfig?: PrintConfig
}

function formatDate(dateStr: IsoDate): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function computeObraDateRange(schedule: { fechaInicio: IsoDate; fechaFin: IsoDate }[]): {
  firstStart: IsoDate | null
  lastEnd: IsoDate | null
} {
  if (schedule.length === 0) return { firstStart: null, lastEnd: null }
  let firstStart = schedule[0]!.fechaInicio
  let lastEnd = schedule[0]!.fechaFin
  for (const t of schedule) {
    if (t.fechaInicio < firstStart) firstStart = t.fechaInicio
    if (t.fechaFin > lastEnd) lastEnd = t.fechaFin
  }
  return { firstStart, lastEnd }
}

function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function resolveScaleMode(printConfig: PrintConfig, schedule: ScheduleTask[], obraStartDate: IsoDate): TimelineScale {
  if (printConfig.viewMode === 'daily' || printConfig.viewMode === 'weekly') {
    return printConfig.viewMode
  }

  return deriveTimelineScale(schedule, obraStartDate)
}

function computeMonthGroups(columns: { key: string; label: string }[]) {
  const groups: { monthName: string; count: number }[] = []
  let currentMonth = ''
  let currentCount = 0

  columns.forEach((col) => {
    const date = new Date(col.key + 'T00:00:00Z')
    const mName = date.toLocaleDateString('es-AR', { month: 'long', timeZone: 'UTC' }).toUpperCase()
    if (mName !== currentMonth) {
      if (currentCount > 0) {
        groups.push({ monthName: currentMonth, count: currentCount })
      }
      currentMonth = mName
      currentCount = 1
    } else {
      currentCount++
    }
  })
  if (currentCount > 0) {
    groups.push({ monthName: currentMonth, count: currentCount })
  }
  return groups
}

export function PrintTimelineTable({ obra, printConfig = DEFAULT_PRINT_CONFIG }: PrintTimelineTableProps) {
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

  const scaleMode = resolveScaleMode(printConfig, printableSchedule, obra.obra.fechaInicioGlobal)
  const columns = buildTimelineColumns({
    tasks: printableSchedule,
    obraStartDate: obra.obra.fechaInicioGlobal,
    scale: scaleMode,
  })

  const { firstStart, lastEnd } = computeObraDateRange(printableSchedule)
  const totalObraDays =
    firstStart && lastEnd ? countWorkingDays(firstStart, lastEnd, obra.holidays) : 0

  const cliente = capitalize(obra.obra.cliente?.trim() || 'Sin especificar')
  const obraNombre = capitalize(obra.obra.nombre)
  const vigencia =
    obra.obra.vigenciaTexto?.trim() || formatDate(obra.obra.fechaInicioGlobal)

  const monthGroups = scaleMode === 'daily' ? computeMonthGroups(columns) : []

  return (
    <div className="print-container">
      {/* ── Letterhead ───────────────────────────────────────── */}
      <header className="print-letterhead">
        <div className="print-letterhead__logo">
          <img
            src="/inther-logo.png"
            alt="INTHER S.R.L. — Aire Acondicionado"
            className="print-letterhead__logo-img"
          />
        </div>
        <div className="print-letterhead__meta">
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Obra:</span>
            <span className="print-letterhead__value">{obraNombre}</span>
          </div>
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Cliente:</span>
            <span className="print-letterhead__value">{cliente}</span>
          </div>
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Vigencia:</span>
            <span className="print-letterhead__value">{vigencia}</span>
          </div>
          <div className="print-letterhead__row">
            <span className="print-letterhead__label">Duración:</span>
            <span className="print-letterhead__value">
              {totalObraDays} días de obra
              <span className="print-letterhead__scale">
                {' '}· Escala {scaleMode === 'daily' ? 'diaria' : 'semanal'}
              </span>
            </span>
          </div>
        </div>
      </header>

      <div className="print-letterhead__divider" />

      {/* ── Date range bar ───────────────────────────────────── */}
      {firstStart && lastEnd ? (
        <div className="print-date-range">
          <span>Desde {formatDate(firstStart)}</span>
          <span className="print-date-range__sep">—</span>
          <span>Hasta {formatDate(lastEnd)}</span>
        </div>
      ) : null}

      {/* ── Table ────────────────────────────────────────────── */}
      {printableSchedule.length === 0 ? (
        <div className="print-empty">
          No hay tareas imprimibles para esta obra.
        </div>
      ) : (
        <table className="print-gantt-table">
          <thead>
            {scaleMode === 'daily' ? (
              <tr>
                <th className="print-gantt-table__task-header" rowSpan={2}>Tarea</th>
                <th className="print-gantt-table__dur-header" rowSpan={2}>Días</th>
                {monthGroups.map((mg, i) => (
                  <th
                    key={`mg-${i}`}
                    colSpan={mg.count}
                    className="print-gantt-table__month-header"
                  >
                    {mg.monthName}
                  </th>
                ))}
              </tr>
            ) : null}
            <tr>
              {scaleMode !== 'daily' ? (
                <>
                  <th className="print-gantt-table__task-header">Tarea</th>
                  <th className="print-gantt-table__dur-header">Días</th>
                </>
              ) : null}
              {columns.map((column) => {
                let dayLabel = column.label
                if (scaleMode === 'daily') {
                  const date = new Date(column.key + 'T00:00:00Z')
                  dayLabel = date.toLocaleDateString('es-AR', {
                    weekday: 'short',
                    day: '2-digit',
                    timeZone: 'UTC',
                  }).replace('.', '')
                }
                return (
                  <th key={column.key} className="print-gantt-table__col-header py-1 font-semibold">
                    {dayLabel}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {printableSchedule.map((task, rowIdx) => (
              <tr key={task.id} className="print-row">
                <td className="print-gantt-table__task-name">{task.nombre}</td>
                <td className="print-gantt-table__task-dur">{task.duracionDias}</td>
                {columns.map((column, columnIndex) => {
                  const range = getTaskTimelineRange({
                    task,
                    obraStartDate: obra.obra.fechaInicioGlobal,
                    scale: scaleMode,
                  })
                  const isInRange =
                    columnIndex >= range.startIndex &&
                    columnIndex < range.startIndex + range.span
                  const isWeekendCol =
                    scaleMode === 'daily' ? isWeekend(column.key) : false
                  const isActive = isInRange && !isWeekendCol

                  return (
                    <td
                      key={`${task.id}-${column.key}`}
                      className={`print-gantt-table__cell ${
                        isActive
                          ? rowIdx % 2 === 0
                            ? 'print-gantt-table__cell--active-a'
                            : 'print-gantt-table__cell--active-b'
                          : isWeekendCol
                            ? 'print-gantt-table__cell--weekend'
                            : ''
                      }`}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="print-footer">
        <span>INTHER S.R.L. — Aire Acondicionado</span>
        <span className="print-footer__date">
          Impreso: {new Date().toLocaleDateString('es-AR')}
        </span>
      </footer>
    </div>
  )
}
