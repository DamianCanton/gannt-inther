'use client'

import { useMemo, useState } from 'react'

import { detectCycle } from '@/lib/gantt-dag'
import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import { GanttGrid } from './gantt-grid'
import { TaskEditor } from './task-editor'
import type { GanttEditIntent, GanttMutationError, GanttMutationResult } from './gantt-types'

export interface GanttInteractiveProps {
  obraNombre: string
  projectId: Uuid
  obraStartDate: IsoDate
  printHref: string
  initialSchedule: ScheduleTask[]
  initialScheduleError?: string | null
  onMutateTask: (payload: GanttEditIntent) => Promise<GanttMutationResult>
}

export function GanttInteractive({
  obraNombre,
  projectId,
  obraStartDate,
  printHref,
  initialSchedule,
  initialScheduleError = null,
  onMutateTask,
}: GanttInteractiveProps) {
  const [schedule, setSchedule] = useState<ScheduleTask[]>(initialSchedule)
  const [selectedTaskId, setSelectedTaskId] = useState<Uuid | null>(initialSchedule[0]?.id ?? null)
  const [saveError, setSaveError] = useState<GanttMutationError | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const blockingError = initialScheduleError

  const selectedTask = useMemo(
    () => schedule.find((task) => task.id === selectedTaskId) ?? null,
    [schedule, selectedTaskId]
  )

  const cycleWarning = useMemo(() => {
    const cycle = detectCycle(schedule)
    return cycle.length > 0 ? cycle.join(' -> ') : null
  }, [schedule])

  const summary = useMemo(() => {
    return selectedTask
      ? `${selectedTask.nombre} · ${selectedTask.fechaInicio} → ${selectedTask.fechaFin}`
      : 'Seleccioná una tarea para ver sus detalles.'
  }, [selectedTask])

  async function handleSubmit(payload: GanttEditIntent) {
    setIsMutating(true)

    try {
      const result = await onMutateTask(payload)

      if (result.error) {
        const mappedError = result.error
        setSaveError(mappedError)
        return { error: mappedError.message }
      }

      if (result.schedule) {
        const previousSelectedTaskId = selectedTaskId
        setSchedule(result.schedule)
        setSaveError(null)

        const stillSelected = result.schedule.find((task) => task.id === previousSelectedTaskId)
        setSelectedTaskId(stillSelected?.id ?? result.schedule.at(-1)?.id ?? result.schedule[0]?.id ?? null)
      }

      return {}
    } finally {
      setIsMutating(false)
    }
  }

  if (blockingError) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-2xl font-bold">{obraNombre}</h1>
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{blockingError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{obraNombre}</h1>
            <p className="text-sm text-gray-600">Proyecto: {projectId}</p>
            <p className="text-sm text-gray-600">{summary}</p>
          </div>
          <a
            href={printHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Exportar PDF/Imprimir
          </a>
        </div>
      </header>

      {cycleWarning ? (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          Dependencia circular detectada: {cycleWarning}
        </p>
      ) : null}

      {saveError ? (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {saveError.message}
        </p>
      ) : null}

      {isMutating ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-700"
        >
          Guardando cambios en el cronograma...
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <TaskEditor
          tasks={schedule}
          selectedTaskId={selectedTaskId}
          selectedTask={selectedTask}
          pending={isMutating}
          error={saveError?.message ?? null}
          onSelectTask={setSelectedTaskId}
          onSubmit={handleSubmit}
          onCancelIntent={() => setSaveError(null)}
        />

        <GanttGrid
          tasks={schedule}
          obraStartDate={obraStartDate}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
        />
      </div>
    </div>
  )
}
