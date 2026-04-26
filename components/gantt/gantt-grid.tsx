'use client'

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

import { isWeekend } from '@/lib/date-engine'
import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import type { InteractiveHierarchyRow } from './hierarchy-utils'

import {
  buildTimelineColumns,
  deriveTimelineScale,
  getTaskTimelineRange,
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
}

const COLUMN_WIDTH_PX = 72
const TASK_LABEL_WIDTH_PX = 200

export function GanttGrid({
  tasks,
  obraStartDate,
  selectedTaskId,
  initialCenteredTaskId = null,
  onSelectTask,
  hierarchyRowsByTaskId,
  onToggleParent,
  viewportClassName,
}: GanttGridProps) {
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
  })
  const suppressClickRef = useRef(false)

  const scale = deriveTimelineScale(tasks, obraStartDate)
  const columns = buildTimelineColumns({ tasks, obraStartDate, scale })
  const todayIso = new Date().toISOString().slice(0, 10)

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
      <section className="rounded border border-gray-200 bg-white">
        <header className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Tareas</h2>
          <p className="text-sm text-gray-500">Seleccioná una fila para ver dependencias.</p>
        </header>
        <div className="p-4 text-sm text-gray-500">Todavía no hay tareas cargadas.</div>
        <div className="rounded border border-dashed border-gray-300 m-4 p-6 text-sm text-gray-500">
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
        className="sticky top-0 left-0 z-30 border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
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
        className={`sticky top-0 z-20 border-b border-r border-gray-200 px-2 py-2 text-center text-xs font-medium ${
          isToday
            ? 'bg-blue-100 text-blue-800 font-semibold'
            : 'bg-gray-50 text-gray-600'
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
    const hierarchyRow = hierarchyRowsByTaskId?.get(task.id)
    const depth = hierarchyRow?.depth ?? ((task.parentId ?? null) === null ? 0 : 1)
    const hasChildren = hierarchyRow?.hasChildren ?? false
    const isCollapsed = hierarchyRow?.isCollapsed ?? false
    const canToggle = hasChildren && onToggleParent
    const labelPadding = 12 + depth * 20
    const rowStatusLabel = depth === 0 ? 'Tarea principal' : 'Subtarea'

    // Task label cell (sticky left)
    cells.push(
      <div
        key={`label-${task.id}`}
        className={`sticky left-0 z-10 flex cursor-pointer flex-col items-start justify-center border-b border-r border-gray-200 px-3 py-2 text-left ${
          isSelected ? 'bg-blue-50' : 'bg-white'
        } hover:bg-blue-50/50`}
        style={{ paddingLeft: `${labelPadding}px` }}
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
        <span className="flex items-center gap-1 text-sm font-medium text-gray-900">
          {canToggle ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-600 hover:bg-gray-200"
              aria-label={`${isCollapsed ? 'Expandir' : 'Contraer'} ${task.nombre}`}
              onClick={(event) => {
                event.stopPropagation()
                onToggleParent?.(task.id)
              }}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : null}
          {task.nombre}
        </span>
        <span className="text-xs text-gray-500">
          {rowStatusLabel} · {task.fechaInicio} → {task.fechaFin} · {task.duracionDias}d
        </span>
      </div>
    )

    // Date cells
    columns.forEach((column, columnIndex) => {
      const isInRange =
        columnIndex >= range.startIndex &&
        columnIndex < range.startIndex + range.span
      const isActive = isInRange && !isWeekend(column.key)
      const isToday = column.key === todayIso

      cells.push(
        <div
          key={`${task.id}-${column.key}`}
          className={`border-b border-r border-gray-200 transition-colors ${
            isActive ? 'bg-blue-200' : ''
          } ${isToday && !isActive ? 'bg-blue-50 today-marker' : ''} ${
            isSelected && !isActive ? 'bg-blue-50/40' : ''
          }`}
          onClick={() => onSelectTask(task.id)}
          role="gridcell"
          aria-label={
            isActive
              ? `Barra de ${task.nombre}: ${column.key}`
              : undefined
          }
        />
      )
    })
  })

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-2 min-w-0 w-full">
      {/* ── Outer: vertical scroll only ── */}
      <div
        className={`relative w-full overflow-y-auto overflow-x-hidden rounded border border-gray-200 bg-white ${viewportClassName ?? 'max-h-[calc(100vh-280px)]'}`}
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
            className="grid relative"
            style={{
              gridTemplateColumns: `${TASK_LABEL_WIDTH_PX}px repeat(${columns.length}, ${COLUMN_WIDTH_PX}px)`,
              width: 'max-content',
            }}
            role="rowgroup"
          >
            {cells}
          </div>
        </div>
      </div>
    </div>
  )
}
