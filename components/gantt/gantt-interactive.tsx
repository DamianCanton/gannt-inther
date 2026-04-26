'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { Dialog } from '@/components/ui/dialog'
import { detectCycle } from '@/lib/gantt-dag'
import type { IsoDate, PrintConfig, ScheduleTask, Uuid } from '@/types/gantt'

import { GanttAlerts } from './gantt-alerts'
import { GanttGrid } from './gantt-grid'
import { GanttHeader } from './gantt-header'
import { flattenHierarchyForInteractive } from './hierarchy-utils'
import { serializePrintConfig } from './print-projection'
import { PrintConfigModal, type PrintConfigDraft } from './print-config-modal'
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
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<Uuid>>(new Set())

  // ---------------------------------------------------------------------------
  // Mutation lifecycle state
  // ---------------------------------------------------------------------------
  const [saveError, setSaveError] = useState<GanttMutationError | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [isExpandedViewOpen, setIsExpandedViewOpen] = useState(false)
  const [isFullscreenActive, setIsFullscreenActive] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const fullscreenContentRef = useRef<HTMLDivElement>(null)
  const [printDraft, setPrintDraft] = useState<PrintConfigDraft>({
    selectionMode: 'visible',
    includeVisibleSubtasks: true,
    includeOneDayTasks: true,
    expandAllBeforePrint: false,
    manualTaskIds: [],
  })

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const blockingError = initialScheduleError

  const selectedTask = useMemo(
    () => schedule.find((task) => task.id === selectedTaskId) ?? null,
    [schedule, selectedTaskId]
  )

  const hierarchyRows = useMemo(
    () => flattenHierarchyForInteractive(schedule, collapsedParentIds),
    [schedule, collapsedParentIds]
  )

  const visibleSchedule = useMemo(
    () => hierarchyRows.map((row) => row.task),
    [hierarchyRows]
  )

  const hierarchyRowsByTaskId = useMemo(() => {
    return new Map(hierarchyRows.map((row) => [row.task.id, row]))
  }, [hierarchyRows])

  const visibleTaskIds = useMemo(() => visibleSchedule.map((task) => task.id), [visibleSchedule])

  const expandedHierarchyRows = useMemo(
    () => flattenHierarchyForInteractive(schedule, new Set()),
    [schedule]
  )

  const expandedTaskIds = useMemo(
    () => expandedHierarchyRows.map((row) => row.task.id),
    [expandedHierarchyRows]
  )

  const cycleWarning = useMemo(() => {
    const cycle = detectCycle(schedule)
    return cycle.length > 0 ? cycle.join(' -> ') : null
  }, [schedule])

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreenActive(document.fullscreenElement === fullscreenContentRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

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

  function handleToggleParent(parentId: Uuid) {
    setCollapsedParentIds((previous) => {
      const next = new Set(previous)
      const isCollapsing = !next.has(parentId)
      if (next.has(parentId)) {
        next.delete(parentId)
      } else {
        next.add(parentId)
      }

      const selectedTask = schedule.find((task) => task.id === selectedTaskId)
      if (isCollapsing && selectedTask && (selectedTask.parentId ?? null) === parentId) {
        setSelectedTaskId(parentId)
      }

      return next
    })
  }

  function handleOpenPrintOptions() {
    setIsPrintModalOpen(true)
  }

  function handleOpenExpandedView() {
    setIsExpandedViewOpen(true)
  }

  function handleCloseExpandedView() {
    setIsExpandedViewOpen(false)
  }

  async function handleToggleFullscreen() {
    const fullscreenElement = fullscreenContentRef.current

    if (!fullscreenElement) {
      return
    }

    if (document.fullscreenElement === fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await fullscreenElement.requestFullscreen()
  }

  function handleClosePrintOptions() {
    setIsPrintModalOpen(false)
  }

  function handleToggleManualTask(taskId: Uuid) {
    setPrintDraft((previous) => {
      const selected = new Set(previous.manualTaskIds)
      if (selected.has(taskId)) {
        selected.delete(taskId)
      } else {
        selected.add(taskId)
      }

      return {
        ...previous,
        manualTaskIds: Array.from(selected),
      }
    })
  }

  function handleConfirmPrint() {
    const visibleIdsForPrint = printDraft.expandAllBeforePrint ? expandedTaskIds : visibleTaskIds
    const printConfig: PrintConfig = {
      selectionMode: printDraft.selectionMode,
      includeVisibleSubtasks: printDraft.includeVisibleSubtasks,
      includeOneDayTasks: printDraft.includeOneDayTasks,
      expandAllBeforePrint: printDraft.expandAllBeforePrint,
      visibleTaskIds: visibleIdsForPrint,
      manualTaskIds: printDraft.manualTaskIds,
    }

    const printConfigQuery = serializePrintConfig(printConfig)
    const printUrl = new URL(printHref, window.location.origin)
    printUrl.searchParams.set('config', printConfigQuery)
    window.open(printUrl.toString(), '_blank', 'noopener,noreferrer')
    setIsPrintModalOpen(false)
  }

  // ---------------------------------------------------------------------------
  // Render: blocking error state
  // ---------------------------------------------------------------------------
  if (blockingError) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-bold">{obraNombre}</h1>
        <GanttAlerts cycleWarning={null} saveError={null} isMutating={false} blockingError={blockingError} />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: main interactive layout
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4 p-4 md:p-8">
      <GanttHeader
        obraNombre={obraNombre}
        projectId={projectId}
        selectedTask={selectedTask}
        onOpenExpandedView={handleOpenExpandedView}
        onOpenPrintOptions={handleOpenPrintOptions}
      />

      <Dialog
        open={isExpandedViewOpen}
        onClose={handleCloseExpandedView}
        title={`Vista ampliada · ${obraNombre}`}
        className="h-[94vh] w-[96vw] max-h-[94vh] max-w-[1800px] overflow-hidden"
      >
        <div
          ref={fullscreenContentRef}
          className={`flex flex-col gap-4 overflow-hidden bg-white ${
            isFullscreenActive ? 'h-screen p-6' : 'h-[calc(94vh-96px)]'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">Modo pro del cronograma</p>
              <p className="text-sm text-gray-600">
                Vista previa grande para trabajar mejor. Si necesitás ocupar toda la pantalla, usá el modo fullscreen.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {isFullscreenActive ? 'Salir de pantalla completa' : 'Pantalla completa'}
              </button>
              <button
                type="button"
                onClick={handleCloseExpandedView}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cerrar vista ampliada
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 shadow-sm">
            Navegación: mantené click izquierdo sobre el gráfico y arrastrá hacia los costados para desplazarte horizontalmente.
          </div>
          <div className="min-h-0 min-w-0 flex-1">
            <GanttGrid
              tasks={visibleSchedule}
              obraStartDate={obraStartDate}
              selectedTaskId={selectedTaskId}
              initialCenteredTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              hierarchyRowsByTaskId={hierarchyRowsByTaskId}
              onToggleParent={handleToggleParent}
              viewportClassName="h-full"
            />
          </div>
        </div>
      </Dialog>

      <PrintConfigModal
        isOpen={isPrintModalOpen}
        draft={printDraft}
        taskOptions={expandedHierarchyRows.map((row) => ({
          id: row.task.id,
          nombre: row.task.nombre,
          depth: row.depth,
          duracionDias: row.task.duracionDias,
        }))}
        onClose={handleClosePrintOptions}
        onSelectionModeChange={(selectionMode) => {
          setPrintDraft((previous) => ({ ...previous, selectionMode }))
        }}
        onIncludeVisibleSubtasksChange={(includeVisibleSubtasks) => {
          setPrintDraft((previous) => ({ ...previous, includeVisibleSubtasks }))
        }}
        onIncludeOneDayTasksChange={(includeOneDayTasks) => {
          setPrintDraft((previous) => ({ ...previous, includeOneDayTasks }))
        }}
        onExpandAllBeforePrintChange={(expandAllBeforePrint) => {
          setPrintDraft((previous) => ({ ...previous, expandAllBeforePrint }))
        }}
        onToggleManualTask={handleToggleManualTask}
        onConfirm={handleConfirmPrint}
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

        <div className="min-w-0">
          <GanttGrid
            tasks={visibleSchedule}
            obraStartDate={obraStartDate}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            hierarchyRowsByTaskId={hierarchyRowsByTaskId}
            onToggleParent={handleToggleParent}
          />
        </div>
      </div>
    </div>
  )
}
