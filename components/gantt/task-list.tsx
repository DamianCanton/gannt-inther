import type { ScheduleTask, Uuid } from '@/types/gantt'

import { Button } from '@/components/ui/button'

export interface TaskListProps {
  tasks: ScheduleTask[]
  selectedTaskId: Uuid | null
  onSelectTask: (taskId: Uuid) => void
}

export function TaskList({ tasks, selectedTaskId, onSelectTask }: TaskListProps) {
  return (
    <section className="rounded border border-gray-200 bg-white">
      <header className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Tareas</h2>
        <p className="text-sm text-gray-500">Seleccioná una fila para ver dependencias.</p>
      </header>

      {tasks.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">Todavía no hay tareas cargadas.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {tasks.map((task) => {
            const isSelected = task.id === selectedTaskId

            return (
              <li key={task.id}>
                <Button
                  type="button"
                  variant={isSelected ? 'secondary' : 'ghost'}
                  className={`flex w-full flex-col items-start gap-1 rounded-none px-4 py-3 text-left ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onSelectTask(task.id)}
                >
                  <span className="font-medium text-gray-900">{task.nombre}</span>
                  <span className="text-xs text-gray-500">
                    {task.fechaInicio} → {task.fechaFin} · {task.duracionDias} días
                  </span>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
