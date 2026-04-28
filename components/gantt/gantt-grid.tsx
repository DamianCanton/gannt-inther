'use client'

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

import { isWeekend } from '@/lib/date-engine'
import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import type { InteractiveHierarchyRow } from './hierarchy-utils'

import {
  buildTimelineColumns,
  deriveTimelineScale,
  getTaskTimelineRange,
  type TimelineScale,
} from './timeline-utils'

export interface GanttGridProps {
  tasks: ScheduleTask[]
  obraStartDate: IsoDate
  selectedTaskId: Uuid | null
  initialCenteredTaskId?: Uuid | null
  onSelectTask: (taskId: Uuid) => void
  hierarchyRowsByTaskId?: ReadonlyMap<Uuid, InteractiveHierarchyRow>
  onToggleParent?: (taskId: Uuid) => void
  viewportClassName?: string
  forcedScale?: TimelineScale
  showHolidays?: boolean
}

const COLUMN_WIDTH_PX = 72
const TASK_LABEL_WIDTH_PX = 330

export function GanttGrid({
  tasks,
  obraStartDate,
  selectedTaskId,
  initialCenteredTaskId = null,
  onSelectTask,
  hierarchyRowsByTaskId,
  onToggleParent,
  viewportClassName,
  forcedScale,
  showHolidays = true,
}: GanttGridProps) {
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
  })
  const suppressClickRef = useRef(false)

  const scale = forcedScale ?? deriveTimelineScale(tasks, obraStartDate)
  const columns = buildTimelineColumns({ tasks, obraStartDate, scale })
  const taskIds = new Set(tasks.map((task) => task.id))
  const todayIso = new Date().toISOString().slice(0, 10)
  const todayColumnIndex = columns.findIndex((column) => {
    if (scale === 'daily') {
      return column.key === todayIso
    }

    return column.start <= todayIso && todayIso <= column.end
  })

  useEffect(() => {
    if (!initialCenteredTaskId || !timelineScrollRef.current) {
      return
    }

    const taskToCenter = tasks.find((task) => task.id === initialCenteredTaskId)
    if (!taskToCenter) {
      return
    }

    const range = getTaskTimelineRange({ task: taskToCenter, obraStartDate, scale })
    const container = timelineScrollRef.current
    const contentWidth = TASK_LABEL_WIDTH_PX + columns.length * COLUMN_WIDTH_PX
    const taskCenterPx =
      TASK_LABEL_WIDTH_PX +
      range.startIndex * COLUMN_WIDTH_PX +
      (range.span * COLUMN_WIDTH_PX) / 2

    const nextScrollLeft = Math.max(
      0,
      Math.min(contentWidth - container.clientWidth, taskCenterPx - container.clientWidth / 2)
    )

    container.scrollLeft = nextScrollLeft
  }, [columns.length, initialCenteredTaskId, obraStartDate, scale, tasks])

  function handleTimelinePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement | null
    if (target?.closest('button, input, select, textarea, a')) {
      return
    }

    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleTimelinePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current.isDragging) {
      return
    }

    const deltaX = event.clientX - dragStateRef.current.startX
    const nextScrollLeft = dragStateRef.current.startScrollLeft - deltaX
    event.currentTarget.scrollLeft = nextScrollLeft

    if (Math.abs(deltaX) > 4) {
      suppressClickRef.current = true
    }
  }

  function handleTimelinePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current.isDragging) {
      return
    }

    dragStateRef.current.isDragging = false

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleTimelineClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) {
      return
    }

    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  // ── Empty state ─────────────────────────────────────────────────

  if (tasks.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Cronograma</h2>
          <p className="text-sm text-slate-500">Seleccioná una fila para abrir el editor lateral.</p>
        </header>
        <div className="p-4 text-sm text-slate-500">Todavía no hay tareas cargadas.</div>
        <div className="m-4 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          La línea de tiempo aparece acá cuando cargues tareas.
        </div>
      </section>
    )
  }

  // ── Build flat cell array for unified CSS Grid ──────────────────
  // Layout: 1 label column + N date columns per row.
  // All cells are direct children of the SAME grid, guaranteeing
  // pixel-perfect row height alignment — no scroll sync needed.

  const cells: ReactNode[] = []

  // Header row cells
  cells.push(
      <div
        key="hdr-label"
        className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700"
        role="columnheader"
      >
        Tareas
      </div>
  )

  columns.forEach((column) => {
    const isToday = column.key === todayIso
    cells.push(
      <div
        key={`hdr-${column.key}`}
          className={`sticky top-0 z-20 border-b border-r border-slate-200 px-2 py-2 text-center text-xs font-medium ${
          isToday
            ? 'bg-accent/10 font-semibold text-accent'
            : 'bg-white text-slate-600'
        }`}
        role="columnheader"
      >
        {column.label}
      </div>
    )
  })

  // Task row cells
  tasks.forEach((task) => {
    const isSelected = task.id === selectedTaskId
    const range = getTaskTimelineRange({ task, obraStartDate, scale })
    const rowStatusLabel = 'Tarea'
    const dependencySource = task.dependeDeId ? tasks.find((candidate) => candidate.id === task.dependeDeId) : null

    // Task label cell (sticky left)
    cells.push(
      <div
        key={`label-${task.id}`}
          className={`sticky left-0 z-10 flex cursor-pointer flex-col items-start justify-center border-b border-r border-slate-200 px-4 py-3 text-left ${
            isSelected ? 'bg-accent/10 shadow-[inset_3px_0_0_0_#f69323]' : 'bg-white'
          } hover:bg-slate-50`}
        onClick={() => onSelectTask(task.id)}
        role="button"
        tabIndex={0}
        aria-label={`${task.nombre} · ${task.fechaInicio} → ${task.fechaFin}`}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelectTask(task.id)
          }
        }}
        >
          <span className="text-sm font-medium text-slate-900">{task.nombre}</span>
         <span className="text-xs leading-5 text-slate-500">
           {rowStatusLabel} · {task.fechaInicio} → {task.fechaFin} · {task.duracionDias}d
         </span>
      </div>
    )

    // Date cells
      columns.forEach((column, columnIndex) => {
        const isInRange =
          columnIndex >= range.startIndex &&
          columnIndex < range.startIndex + range.span
        const weekendReference = scale === 'daily' ? column.key : column.start
        const isActive = isInRange && !isWeekend(weekendReference)
        const isToday = scale === 'daily' && column.key === todayIso
        const isRangeStart = isActive && columnIndex === range.startIndex
        const isRangeEnd = isActive && columnIndex === range.startIndex + range.span - 1
        const isWeekendColumn = showHolidays && scale === 'daily' && isWeekend(column.key)

        cells.push(
          <div
            key={`${task.id}-${column.key}`}
            className={`relative border-b border-r border-slate-200 transition-colors ${
              isWeekendColumn ? 'bg-slate-100' : 'bg-white'
             } ${isToday && !isActive ? 'today-marker bg-accent/10' : ''} ${isSelected && !isActive ? 'bg-accent/10' : ''}`}
            onClick={() => onSelectTask(task.id)}
            role="gridcell"
            aria-label={
            isActive
              ? `Barra de ${task.nombre}: ${column.key}`
              : undefined
          }
          >
            {isActive ? (
              <div
                 className={`mx-1 h-6 shadow-sm ${
                    isSelected ? 'bg-accent ring-2 ring-accent/70 ring-offset-0' : 'bg-accent/85'
                  } ${isRangeStart ? 'rounded-l-full' : ''} ${isRangeEnd ? 'rounded-r-full' : ''}`}
               />
            ) : null}
          </div>
        )
      })

    if (dependencySource && task.dependeDeId !== null && taskIds.has(task.dependeDeId)) {
      cells.push(
        <div
          key={`dep-${dependencySource.id}-${task.id}`}
          role="img"
          aria-label={`Dependencia ${dependencySource.nombre} → ${task.nombre}`}
          className="sr-only"
        />
      )
    }
  })

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-2 min-w-0 w-full">
      {/* ── Outer: vertical scroll only ── */}
      <div
        className={`relative w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white ${viewportClassName ?? 'max-h-[calc(100vh-280px)]'}`}
        role="grid"
        aria-label="Cronograma de tareas"
      >
        {/* ── Inner: horizontal scroll only (native scrollbar) ── */}
        <div
          ref={timelineScrollRef}
          className="timeline-drag-surface timeline-scrollbar w-full min-w-0 overflow-x-auto overflow-y-hidden"
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerEnd}
          onPointerCancel={handleTimelinePointerEnd}
          onClickCapture={handleTimelineClickCapture}
          aria-label="Superficie desplazable del cronograma"
        >
          {/* The unified CSS Grid — all cells are direct children */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `${TASK_LABEL_WIDTH_PX}px repeat(${columns.length}, ${COLUMN_WIDTH_PX}px)`,
              width: 'max-content',
            }}
            role="rowgroup"
          >
            {todayColumnIndex >= 0 ? (
              <>
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-20 border-l-2 border-dashed border-orange-400"
                  style={{
                    left: `${TASK_LABEL_WIDTH_PX + todayColumnIndex * COLUMN_WIDTH_PX + COLUMN_WIDTH_PX / 2}px`,
                  }}
                />
                <div
                  className="pointer-events-none absolute bottom-2 z-20 -translate-x-1/2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                  style={{
                    left: `${TASK_LABEL_WIDTH_PX + todayColumnIndex * COLUMN_WIDTH_PX + COLUMN_WIDTH_PX / 2}px`,
                  }}
                >
                  Hoy
                </div>
              </>
            ) : null}
            {cells}
          </div>
        </div>
      </div>
    </div>
  )
}
