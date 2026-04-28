import { isWeekend } from '@/lib/date-engine'
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
  todayRef?: React.RefObject<HTMLDivElement | null>
}

/**
 * Presentational component: renders only the column-header cells and the
 * task-bar rows. Container layout, sticky headers, and scroll controls are
 * owned by GanttGrid.
 */
export function TimelineGrid({
  tasks,
  obraStartDate,
  selectedTaskId,
  onSelectTask,
  todayRef,
}: TimelineGridProps) {
  const scale = deriveTimelineScale(tasks, obraStartDate)
  const columns = buildTimelineColumns({ tasks, obraStartDate, scale })

  const todayIso = new Date().toISOString().slice(0, 10)

  if (tasks.length === 0) {
    return (
      <div className="col-span-full flex items-center justify-center p-6 text-sm text-gray-500">
        La línea de tiempo aparece acá cuando cargues tareas.
      </div>
    )
  }

  return (
    <>
      {/* ── Column header cells ── */}
      {columns.map((column) => {
        const isToday = column.key === todayIso
        return (
          <div
            key={column.key}
              className={`border border-gray-200 px-2 py-2 text-center text-xs font-medium ${
              isToday
                ? 'bg-accent/10 text-accent font-semibold'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            {column.label}
          </div>
        )
      })}

      {/* ── Task rows ── */}
      {tasks.map((task) => {
        const range = getTaskTimelineRange({ task, obraStartDate, scale })
        const isSelected = task.id === selectedTaskId

        return columns.map((column, columnIndex) => {
          const isInRange = columnIndex >= range.startIndex && columnIndex < range.startIndex + range.span
          const isActive = isInRange && !isWeekend(column.key)
          const isToday = column.key === todayIso
          const isFirstCell = columnIndex === 0

          // The first cell in each row gets a ref for "scroll to today"
          const cellRef = isToday && todayRef ? todayRef : undefined

          return (
            <div
              key={`${task.id}-${column.key}`}
              ref={cellRef as React.Ref<HTMLDivElement> | undefined}
              className={`min-h-[36px] border border-gray-200 px-1 py-1 transition-colors ${
                isActive ? 'bg-accent/20' : ''
              } ${isToday && !isActive ? 'bg-accent/10 today-marker' : ''} ${
                isSelected && !isActive ? 'bg-accent/10' : ''
              } ${isFirstCell ? 'cursor-pointer hover:bg-accent/5' : ''}`}
              onClick={() => onSelectTask(task.id)}
              role="gridcell"
              aria-label={isActive ? `Barra de ${task.nombre}` : undefined}
            />
          )
        })
      })}
    </>
  )
}
