'use client'

import { type ReactNode } from 'react'

import { isWeekend } from '@/lib/date-engine'
import type { IsoDate, ScheduleTask, Uuid } from '@/types/gantt'

import {
  buildTimelineColumns,
  deriveTimelineScale,
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

export function GanttGrid({ tasks, obraStartDate, selectedTaskId, onSelectTask }: GanttGridProps) {
  const scale = deriveTimelineScale(tasks, obraStartDate)
  const columns = buildTimelineColumns({ tasks, obraStartDate, scale })
  const todayIso = new Date().toISOString().slice(0, 10)

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
    <div className="space-y-2 min-w-0 w-full">
      {/* ── Outer: vertical scroll only ── */}
      <div
        className="w-full max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden rounded border border-gray-200 bg-white relative"
        role="grid"
        aria-label="Cronograma de tareas"
      >
        {/* ── Inner: horizontal scroll only (native scrollbar) ── */}
        <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden">
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
