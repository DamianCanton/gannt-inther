import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

export interface GanttHeaderProps {
  obraNombre: string
  projectId: Uuid
  selectedTask: ScheduleTask | null
  onOpenExpandedView: () => void
  onOpenPrintOptions: () => void
}

function buildSummary(task: ScheduleTask | null): string {
  if (!task) {
    return 'Seleccioná una tarea para ver sus detalles.'
  }

  return `${task.nombre} · ${task.fechaInicio} → ${task.fechaFin}`
}

export function GanttHeader({
  obraNombre,
  projectId,
  selectedTask,
  onOpenExpandedView,
  onOpenPrintOptions,
}: GanttHeaderProps) {
  const summary = buildSummary(selectedTask)

  return (
    <header className="space-y-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{obraNombre}</h1>
          <p className="text-sm text-gray-600">Proyecto: {projectId}</p>
          <p className="text-sm text-gray-600">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenExpandedView}
            className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Ver gráfico ampliado
          </button>
          <button
            type="button"
            onClick={onOpenPrintOptions}
            className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Exportar PDF/Imprimir
          </button>
        </div>
      </div>
    </header>
  )
}
