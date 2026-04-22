'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { isWeekend } from '@/lib/date-engine'
import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import {
  buildTimelineColumns,
  deriveTimelineScale,
  formatIsoDate,
  getTaskTimelineRange,
} from './timeline-utils'

export interface GanttGridProps {
  tasks: ScheduleTask[]
  obraStartDate: IsoDate
  selectedTaskId: Uuid | null
  onSelectTask: (taskId: Uuid) => void
}

const COLUMN_WIDTH_PX = 72
const TASK_LABEL_WIDTH_PX = 200
const SCROLL_STEP_PX = 300

export function GanttGrid({ tasks, obraStartDate, selectedTaskId, onSelectTask }: GanttGridProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)

  const scale = deriveTimelineScale(tasks, obraStartDate)
  const columns = buildTimelineColumns({ tasks, obraStartDate, scale })
  const todayIso = formatIsoDate(new Date())

  // ── Scroll helpers ──────────────────────────────────────────────

  const scrollTimelineBy = useCallback((deltaX: number) => {
    if (!timelineRef.current) return
    const container = timelineRef.current
    container.scrollTo({
      left: container.scrollLeft + deltaX,
      behavior: 'smooth',
    })
  }, [])

  const scrollToToday = useCallback(() => {
    if (!todayRef.current || !timelineRef.current) return
    const cell = todayRef.current
    const container = timelineRef.current
    
    // offsetLeft depends on the parent being position: relative
    const targetLeft = cell.offsetLeft - (container.clientWidth - TASK_LABEL_WIDTH_PX) / 2 + COLUMN_WIDTH_PX / 2
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    })
  }, [])

  // ── Drag-to-scroll handlers ─────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current || e.button !== 0) return
      // Don't initiate drag on interactive elements
      if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return

      setIsDragging(true)
      dragStartX.current = e.clientX
      dragScrollLeft.current = timelineRef.current.scrollLeft
      e.preventDefault()
    },
    []
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return
      const walk = dragStartX.current - e.clientX
      timelineRef.current.scrollLeft = dragScrollLeft.current + walk
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // ── Keyboard shortcuts ──────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!timelineRef.current) return

      if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault()
        scrollTimelineBy(-SCROLL_STEP_PX)
      } else if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault()
        scrollTimelineBy(SCROLL_STEP_PX)
      } else if (e.key === 'Home' && e.altKey) {
        e.preventDefault()
        scrollToToday()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollTimelineBy, scrollToToday])

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

  const cells: React.ReactNode[] = []

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
        ref={isToday ? todayRef : undefined}
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
  tasks.forEach((task, rowIndex) => {
    const isSelected = task.id === selectedTaskId
    const range = getTaskTimelineRange({ task, obraStartDate, scale })

    // Task label cell (sticky left)
    cells.push(
      <button
        key={`label-${task.id}`}
        type="button"
        className={`sticky left-0 z-10 flex flex-col items-start justify-center border-b border-r border-gray-200 px-3 py-2 text-left ${
          isSelected ? 'bg-blue-50' : 'bg-white'
        } cursor-pointer hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset`}
        onClick={() => onSelectTask(task.id)}
        aria-label={`${task.nombre} · ${task.fechaInicio} → ${task.fechaFin}`}
      >
        <span className="text-sm font-medium text-gray-900">{task.nombre}</span>
        <span className="text-xs text-gray-500">
          {task.fechaInicio} → {task.fechaFin} · {task.duracionDias}d
        </span>
      </button>
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
    <div className="space-y-2">
      {/* ── Navigation controls bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
        <span className="text-xs font-medium text-gray-500">Navegación:</span>

        <button
          type="button"
          onClick={() => scrollTimelineBy(-SCROLL_STEP_PX)}
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
          title="Desplazar a la izquierda (Alt + ←)"
          aria-label="Desplazar a la izquierda"
        >
          ◀ Izquierda
        </button>

        <button
          type="button"
          onClick={scrollToToday}
          className="inline-flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100 active:bg-blue-200"
          title="Ir a la fecha de hoy (Alt + Home)"
          aria-label="Ir a hoy"
        >
          📅 Ir a Hoy
        </button>

        <button
          type="button"
          onClick={() => scrollTimelineBy(SCROLL_STEP_PX)}
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
          title="Desplazar a la derecha (Alt + →)"
          aria-label="Desplazar a la derecha"
        >
          Derecha ▶
        </button>

        <span className="ml-auto hidden text-xs text-gray-400 sm:inline">
          Arrastrá el cronograma · Alt+←→ · Alt+Home = Hoy
        </span>
      </div>

      {/* ── Unified Grid Container ── */}
      <div
        className="gantt-scrollbar-y max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-hidden rounded border border-gray-200 bg-white"
        role="grid"
        aria-label="Cronograma de tareas"
      >
        {/* Horizontal scroll wrapper (drag-to-scroll enabled) */}
        <div
          ref={timelineRef}
          className={`gantt-scrollbar-x overflow-x-auto relative ${isDragging ? 'dragging' : 'drag-to-scroll'}`}
          onMouseDown={handleMouseDown}
        >
          {/* The unified CSS Grid — all cells are direct children */}
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `${TASK_LABEL_WIDTH_PX}px repeat(${columns.length}, ${COLUMN_WIDTH_PX}px)`,
              width: 'max-content',
              minWidth: '100%',
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
