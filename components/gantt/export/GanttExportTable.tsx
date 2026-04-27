import { isWeekend } from '@/lib/date-engine'
import type { ScheduleTask } from '@/types/gantt'
import type { ExportColumn, ExportScale } from './GanttExportSurface'

export interface GanttExportTableProps {
  scaleMode: ExportScale
  columns: ExportColumn[]
  monthGroups: { monthName: string; count: number }[]
  tasks: ScheduleTask[]
  getTaskRange: (task: ScheduleTask) => { startIndex: number; span: number }
  taskColumnWidth: number
}

function formatDailyLabel(columnKey: string, fallback: string): string {
  const date = new Date(`${columnKey}T00:00:00Z`)
  return date
    .toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    })
    .replace('.', '') || fallback
}

export function GanttExportTable({
  scaleMode,
  columns,
  monthGroups,
  tasks,
  getTaskRange,
  taskColumnWidth,
}: GanttExportTableProps) {
  if (tasks.length === 0) {
    return <div className="print-empty">No hay tareas imprimibles para esta obra.</div>
  }

  return (
    <table className="print-gantt-table">
      <colgroup>
        <col style={{ width: 260 }} />
        <col style={{ width: 70 }} />
        {columns.map((column) => (
          <col key={`cg-${column.key}`} style={{ width: taskColumnWidth }} />
        ))}
      </colgroup>
      <thead>
        {scaleMode === 'daily' ? (
          <tr>
            <th className="print-gantt-table__task-header" rowSpan={2}>
              Tarea
            </th>
            <th className="print-gantt-table__dur-header" rowSpan={2}>
              Días
            </th>
            {monthGroups.map((monthGroup, index) => (
              <th
                key={`month-group-${monthGroup.monthName}-${index}`}
                colSpan={monthGroup.count}
                className="print-gantt-table__month-header"
              >
                {monthGroup.monthName}
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
          {columns.map((column) => (
            <th key={column.key} className="print-gantt-table__col-header py-1 font-semibold">
              {scaleMode === 'daily' ? formatDailyLabel(column.key, column.label) : column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tasks.map((task, rowIndex) => {
          const taskRange = getTaskRange(task)

          return (
            <tr key={task.id} className="print-row">
              <td className="print-gantt-table__task-name">{task.nombre}</td>
              <td className="print-gantt-table__task-dur">{task.duracionDias}</td>
              {columns.map((column, columnIndex) => {
                const isInRange =
                  columnIndex >= taskRange.startIndex && columnIndex < taskRange.startIndex + taskRange.span
                const isWeekendColumn = scaleMode === 'daily' && isWeekend(column.key)
                const isActive = isInRange && !isWeekendColumn

                return (
                  <td
                    key={`${task.id}-${column.key}`}
                    className={`print-gantt-table__cell ${
                      isActive
                        ? rowIndex % 2 === 0
                          ? 'print-gantt-table__cell--active-a'
                          : 'print-gantt-table__cell--active-b'
                        : isWeekendColumn
                          ? 'print-gantt-table__cell--weekend'
                          : ''
                    }`}
                  />
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
