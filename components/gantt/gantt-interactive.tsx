'use client'

import { useMemo, useState } from 'react'

import { detectCycle } from '@/lib/gantt-dag'
import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import { GanttAlerts } from './gantt-alerts'
import { GanttGrid } from './gantt-grid'
import { GanttHeader } from './gantt-header'
import { TaskEditor } from './task-editor'
import type { GanttEditIntent, GanttMutationError, GanttMutationResult } from './gantt-types'

export interface GanttInteractiveProps {
  obraNombre: string
  projectId: Uuid
  obraId: Uuid
  obraStartDate: IsoDate
  printHref: string
  initialSchedule: ScheduleTask[]
  initialScheduleError?: string | null
  onMutateTask: (payload: GanttEditIntent & { obraId: Uuid }) => Promise<GanttMutationResult>
}

export function GanttInteractive({
  obraNombre,
  projectId,
  obraId,
  obraStartDate,
  printHref,
  initialSchedule,
  initialScheduleError = null,
  onMutateTask,
}: GanttInteractiveProps) {
  // ---------------------------------------------------------------------------
  // Schedule & selection state
  // ---------------------------------------------------------------------------
  const [schedule, setSchedule] = useState<ScheduleTask[]>(initialSchedule)
  const [selectedTaskId, setSelectedTaskId] = useState<Uuid | null>(initialSchedule[0]?.id ?? null)

  // ---------------------------------------------------------------------------
  // Mutation lifecycle state
  // ---------------------------------------------------------------------------
  const [saveError, setSaveError] = useState<GanttMutationError | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const blockingError = initialScheduleError

  const selectedTask = useMemo(
    () => schedule.find((task) => task.id === selectedTaskId) ?? null,
    [schedule, selectedTaskId]
  )

  const cycleWarning = useMemo(() => {
    const cycle = detectCycle(schedule)
    return cycle.length > 0 ? cycle.join(' -> ') : null
  }, [schedule])

  // ---------------------------------------------------------------------------
  // Mutation callback — delegates to server action, reconciles schedule
  // ---------------------------------------------------------------------------
  async function handleSubmit(payload: GanttEditIntent) {
    setIsMutating(true)

    try {
      const result = await onMutateTask({ ...payload, obraId })

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

  // ---------------------------------------------------------------------------
  // Render: blocking error state
  // ---------------------------------------------------------------------------
  if (blockingError) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-2xl font-bold">{obraNombre}</h1>
        <GanttAlerts cycleWarning={null} saveError={null} isMutating={false} blockingError={blockingError} />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: main interactive layout
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4 p-8">
      <GanttHeader
        obraNombre={obraNombre}
        projectId={projectId}
        selectedTask={selectedTask}
        printHref={printHref}
      />

      <GanttAlerts cycleWarning={cycleWarning} saveError={saveError} isMutating={isMutating} />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <TaskEditor
          mode="edit"
          tasks={schedule}
          selectedTaskId={selectedTaskId}
          selectedTask={selectedTask}
          pending={isMutating}
          error={saveError?.message ?? null}
          onSelectTask={setSelectedTaskId}
          onSubmit={handleSubmit}
          onCancel={() => setSaveError(null)}
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
