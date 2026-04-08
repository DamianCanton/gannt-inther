import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import {
  buildTimelineColumns,
  deriveTimelineScale,
  getTaskTimelineRange,
} from './timeline-utils'

export interface TimelineGridProps {
  tasks: ScheduleTask[]
  obraStartDate: IsoDate
  selectedTaskId: Uuid | null
  onSelectTask: (taskId: Uuid) => void
}

export function TimelineGrid({ tasks, obraStartDate, selectedTaskId, onSelectTask }: TimelineGridProps) {
  const scale = deriveTimelineScale(tasks, obraStartDate)
  const columns = buildTimelineColumns({ tasks, obraStartDate, scale })

  return (
    <section className="rounded border border-gray-200 bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Cronograma</h2>
        <p className="text-sm text-gray-500">
          Escala {scale === 'daily' ? 'diaria' : 'semanal'} · desplazá horizontalmente para navegar
        </p>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-max p-4">
          {tasks.length === 0 ? (
            <div className="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-500">
              La línea de tiempo aparece acá cuando cargues tareas.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid" style={{ gridTemplateColumns: `280px repeat(${columns.length}, minmax(72px, 1fr))` }}>
                <div className="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  Tarea
                </div>
                {columns.map((column) => (
                  <div key={column.key} className="border border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-600">
                    {column.label}
                  </div>
                ))}
              </div>

              {tasks.map((task) => {
                const range = getTaskTimelineRange({ task, obraStartDate, scale })
                const isSelected = task.id === selectedTaskId

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className={`grid w-full text-left transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    style={{ gridTemplateColumns: `280px repeat(${columns.length}, minmax(72px, 1fr))` }}
                  >
                    <div className={`sticky left-0 z-10 border border-gray-200 px-3 py-3 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                      <div className="font-medium text-gray-900">{task.nombre}</div>
                      <div className="text-xs text-gray-500">{task.fechaInicio} → {task.fechaFin}</div>
                    </div>
                    {columns.map((column, columnIndex) => {
                      const isActive = columnIndex >= range.startIndex && columnIndex < range.startIndex + range.span

                      return (
                        <div
                          key={`${task.id}-${column.key}`}
                          className={`min-h-10 border border-gray-200 px-1 py-2 ${
                            isActive ? 'bg-blue-200' : 'bg-white'
                          }`}
                        />
                      )
                    })}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
