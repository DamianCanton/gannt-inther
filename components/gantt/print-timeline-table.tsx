import { createSchedule } from '@/lib/gantt-scheduler'
import {
  buildTimelineColumns,
  deriveTimelineScale,
  getTaskTimelineRange,
} from '@/components/gantt/timeline-utils'
import type { ObraSchedule } from '@/types/gantt'

export interface PrintTimelineTableProps {
  obra: ObraSchedule
}

export function PrintTimelineTable({ obra }: PrintTimelineTableProps) {
  const schedule = createSchedule({
    tasks: obra.tasks,
    dependencies: obra.dependencies,
    obraStartDate: obra.obra.fechaInicioGlobal,
    holidays: obra.holidays,
  })
  const scaleMode = deriveTimelineScale(schedule, obra.obra.fechaInicioGlobal)
  const columns = buildTimelineColumns({
    tasks: schedule,
    obraStartDate: obra.obra.fechaInicioGlobal,
    scale: scaleMode,
  })

  return (
    <div className="print-container p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{obra.obra.nombre}</h1>
        <p className="text-sm text-gray-700">Proyecto: {obra.obra.projectId}</p>
        <p className="text-sm text-gray-700">Escala: {scaleMode === 'daily' ? 'Diaria' : 'Semanal'}</p>
      </header>

      {schedule.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          No hay tareas imprimibles para esta obra.
        </div>
      ) : null}

      <table className="print-gantt-table w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white border px-2 py-1 text-left">Tarea</th>
            {columns.map((column) => (
              <th key={column.key} className="border px-2 py-1 whitespace-nowrap">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedule.map((task) => (
            <tr key={task.id} className="print-row">
              <td className="sticky left-0 bg-white border px-2 py-1 font-medium">{task.nombre}</td>
              {columns.map((column, columnIndex) => {
                const range = getTaskTimelineRange({
                  task,
                  obraStartDate: obra.obra.fechaInicioGlobal,
                  scale: scaleMode,
                })
                const isActive =
                  columnIndex >= range.startIndex &&
                  columnIndex < range.startIndex + range.span

                return (
                  <td
                    key={`${task.id}-${column.key}`}
                    className={`border px-1 py-1 ${isActive ? 'bg-blue-200' : 'bg-white'}`}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
