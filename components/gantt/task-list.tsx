import type { ScheduleTask, Uuid } from '@/types/gantt'

import { Button } from '@/components/ui/button'

export interface TaskListProps {
  tasks: ScheduleTask[]
  selectedTaskId: Uuid | null
  onSelectTask: (taskId: Uuid) => void
}

/**
 * Presentational component: renders only the task rows.
 * The header and container layout are owned by GanttGrid.
 */
export function TaskList({ tasks, selectedTaskId, onSelectTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-gray-500">
        Todavía no hay tareas cargadas.
      </div>
    )
  }

  return (
    <>
      {tasks.map((task) => {
        const isSelected = task.id === selectedTaskId

        return (
          <Button
            key={task.id}
            type="button"
            variant={isSelected ? 'secondary' : 'ghost'}
            className={`flex h-full w-full flex-col items-start gap-0.5 rounded-none px-4 py-2 text-left ${
              isSelected ? 'bg-accent/10' : ''
            }`}
            onClick={() => onSelectTask(task.id)}
          >
            <span className="font-medium text-gray-900">{task.nombre}</span>
            <span className="text-xs text-gray-500">
              {task.fechaInicio} → {task.fechaFin} · {task.duracionDias} días
            </span>
          </Button>
        )
      })}
    </>
  )
}
