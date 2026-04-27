'use client'

import { useMemo, useState } from 'react'

import { Search, SlidersHorizontal, X } from 'lucide-react'

import { detectCycle } from '@/lib/gantt-dag'
import type { IsoDate, PrintConfig, ScheduleTask, Uuid } from '@/types/gantt'

import { GanttAlerts } from './gantt-alerts'
import { GanttGrid } from './gantt-grid'
import { GanttHeader } from './gantt-header'
import type { GanttEditIntent, GanttMutationError, GanttMutationResult } from './gantt-types'
import { serializePrintConfig } from './print-projection'
import { PrintConfigModal, type PrintConfigDraft } from './print-config-modal'
import { TaskEditor } from './task-editor'

type DrawerMode = 'create' | 'edit'
type TimelineMode = 'daily' | 'weekly' | 'month'

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

function toUtcDate(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year as number, (month as number) - 1, day as number))
}

function formatRange(start: IsoDate, end: IsoDate): string {
  const formatter = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return `${formatter.format(toUtcDate(start))} → ${formatter.format(toUtcDate(end))}`
}

function countWorkingDays(start: IsoDate, end: IsoDate): number {
  const cursor = toUtcDate(start)
  const finish = toUtcDate(end)
  let count = 0

  while (cursor <= finish) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) {
      count += 1
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return count
}

export function GanttInteractive({
  obraNombre,
  projectId: _projectId,
  obraId,
  obraStartDate,
  printHref,
  initialSchedule,
  initialScheduleError = null,
  onMutateTask,
}: GanttInteractiveProps) {
  const [schedule, setSchedule] = useState<ScheduleTask[]>(initialSchedule)
  const [selectedTaskId, setSelectedTaskId] = useState<Uuid | null>(initialSchedule[0]?.id ?? null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create')
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('daily')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDependencies, setShowDependencies] = useState(true)
  const [showHolidays, setShowHolidays] = useState(true)

  const [saveError, setSaveError] = useState<GanttMutationError | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [printDraft, setPrintDraft] = useState<PrintConfigDraft>({
    selectionMode: 'visible',
    includeOneDayTasks: true,
    expandAllBeforePrint: false,
    manualTaskIds: [],
  })

  const blockingError = initialScheduleError

  const selectedTask = useMemo(
    () => schedule.find((task) => task.id === selectedTaskId) ?? null,
    [schedule, selectedTaskId]
  )

  const orderedSchedule = useMemo(() => {
    return [...schedule].sort((left, right) => {
      const dateCompare = left.fechaInicio.localeCompare(right.fechaInicio)
      if (dateCompare !== 0) {
        return dateCompare
      }

      const orderCompare = left.orden - right.orden
      if (orderCompare !== 0) {
        return orderCompare
      }

      return left.id.localeCompare(right.id)
    })
  }, [schedule])

  const visibleSchedule = useMemo(() => {
    if (!searchQuery.trim()) {
      return orderedSchedule
    }

    const normalized = searchQuery.trim().toLowerCase()
    return orderedSchedule.filter((task) => task.nombre.toLowerCase().includes(normalized))
  }, [orderedSchedule, searchQuery])

  const visibleTaskIds = useMemo(() => visibleSchedule.map((task) => task.id), [visibleSchedule])

  const cycleWarning = useMemo(() => {
    const cycle = detectCycle(schedule)
    return cycle.length > 0 ? cycle.join(' -> ') : null
  }, [schedule])

  const metadata = useMemo(() => {
    if (schedule.length === 0) {
      return 'Cronograma vacío · Agregá la primera tarea para iniciar el plan.'
    }

    const sortedByStart = [...schedule].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
    const sortedByEnd = [...schedule].sort((a, b) => a.fechaFin.localeCompare(b.fechaFin))
    const start = sortedByStart[0]?.fechaInicio ?? obraStartDate
    const end = sortedByEnd.at(-1)?.fechaFin ?? obraStartDate
    const workingDays = countWorkingDays(start, end)
    return `Cronograma activo · ${formatRange(start, end)} · ${workingDays} días hábiles`
  }, [schedule, obraStartDate])

  async function handleSubmit(payload: GanttEditIntent) {
    setIsMutating(true)

    try {
      const result = await onMutateTask({ ...payload, obraId })

      if (result.error) {
        setSaveError(result.error)
        return { error: result.error.message }
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

  function handleSelectTask(taskId: Uuid) {
    setSelectedTaskId(taskId)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }

  function handleOpenCreateDrawer() {
    setDrawerMode('create')
    setDrawerOpen(true)
    setSaveError(null)
  }

  function handleConfirmPrint() {
    const printConfig: PrintConfig = {
      selectionMode: printDraft.selectionMode,
      includeOneDayTasks: printDraft.includeOneDayTasks,
      expandAllBeforePrint: printDraft.expandAllBeforePrint,
      visibleTaskIds,
      manualTaskIds: printDraft.manualTaskIds,
    }

    const printConfigQuery = serializePrintConfig(printConfig)
    const printUrl = new URL(printHref, window.location.origin)
    printUrl.searchParams.set('config', printConfigQuery)
    window.open(printUrl.toString(), '_blank', 'noopener,noreferrer')
    setIsPrintModalOpen(false)
  }

  if (blockingError) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-bold">{obraNombre}</h1>
        <GanttAlerts cycleWarning={null} saveError={null} isMutating={false} blockingError={blockingError} />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <GanttHeader
        obraNombre={obraNombre}
        selectedTask={selectedTask}
        metadata={metadata}
        onBack={() => {
          window.history.back()
        }}
        onCreateTask={handleOpenCreateDrawer}
        onOpenPrintOptions={() => {
          setIsPrintModalOpen(true)
        }}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-1 pr-2">
            <span className="pl-2 text-sm font-medium text-slate-600">Vista:</span>
            {([
              { key: 'daily', label: 'Días' },
              { key: 'weekly', label: 'Semanas' },
              { key: 'month', label: 'Mes' },
            ] as const).map((option) => {
              const isActive = timelineMode === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setTimelineMode(option.key)
                  }}
                   className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                     isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                   }`}
                   aria-pressed={isActive}
                 >
                  {option.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            aria-pressed={showDependencies}
            onClick={() => {
              setShowDependencies((previous) => !previous)
            }}
            className={`inline-flex h-11 items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors ${
              showDependencies
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showDependencies ? 'bg-blue-600' : 'bg-slate-300'
              }`}
              aria-hidden="true"
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  showDependencies ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </span>
            Dependencias
          </button>

          <button
            type="button"
            aria-pressed={showHolidays}
            onClick={() => {
              setShowHolidays((previous) => !previous)
            }}
            className={`inline-flex h-11 items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors ${
              showHolidays
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showHolidays ? 'bg-blue-600' : 'bg-slate-300'
              }`}
              aria-hidden="true"
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  showHolidays ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </span>
            Feriados
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <label htmlFor="gantt-search" className="sr-only">
                Buscar tarea
              </label>
              <input
                id="gantt-search"
                type="search"
                placeholder="Buscar tarea…"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                }}
                className="h-11 w-64 rounded-2xl border border-slate-200 pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <SlidersHorizontal size={16} />
              Filtros
            </button>
          </div>
        </div>
      </section>

      <PrintConfigModal
        isOpen={isPrintModalOpen}
        draft={printDraft}
        taskOptions={orderedSchedule.map((task) => ({
          id: task.id,
          nombre: task.nombre,
          duracionDias: task.duracionDias,
        }))}
        onClose={() => {
          setIsPrintModalOpen(false)
        }}
        onSelectionModeChange={(selectionMode) => {
          setPrintDraft((previous) => ({ ...previous, selectionMode }))
        }}
        onIncludeOneDayTasksChange={(includeOneDayTasks) => {
          setPrintDraft((previous) => ({ ...previous, includeOneDayTasks }))
        }}
        onExpandAllBeforePrintChange={(expandAllBeforePrint) => {
          setPrintDraft((previous) => ({ ...previous, expandAllBeforePrint }))
        }}
        onToggleManualTask={(taskId) => {
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
        }}
        onConfirm={handleConfirmPrint}
      />

      <GanttAlerts cycleWarning={cycleWarning} saveError={saveError} isMutating={isMutating} />

      <div className={`grid gap-4 ${drawerOpen ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          <GanttGrid
            tasks={visibleSchedule}
            obraStartDate={obraStartDate}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
            forcedScale={timelineMode === 'daily' ? 'daily' : 'weekly'}
            showHolidays={showHolidays}
          />
        </div>

        {drawerOpen ? (
          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
            <div className="mb-3 space-y-2 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {drawerMode === 'create' ? 'Nueva tarea' : 'Editar tarea'}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {drawerMode === 'create' ? 'Creación' : 'Edición'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false)
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                    aria-label="Cerrar panel lateral"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              {drawerMode === 'edit' && selectedTask ? (
                <p className="text-sm font-medium text-slate-600">{selectedTask.nombre}</p>
              ) : null}
            </div>

            {drawerMode === 'create' ? (
              <TaskEditor
                mode="create"
                tasks={schedule}
                pending={isMutating}
                error={saveError?.message ?? null}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setSaveError(null)
                }}
              />
            ) : (
              <TaskEditor
                mode="edit"
                tasks={schedule}
                selectedTaskId={selectedTaskId}
                selectedTask={selectedTask}
                pending={isMutating}
                error={saveError?.message ?? null}
                onSelectTask={(taskId) => {
                  setSelectedTaskId(taskId)
                }}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setSaveError(null)
                }}
              />
            )}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
