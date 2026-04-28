"use client"

import { ArrowLeft, FileDown, Plus } from 'lucide-react'

import type { ScheduleTask } from '@/types/gantt'

export interface GanttHeaderProps {
  obraNombre: string
  selectedTask: ScheduleTask | null
  metadata: string
  onBack: () => void
  onCreateTask: () => void
  onOpenPrintOptions: () => void
}

function buildSummary(task: ScheduleTask | null): string {
  if (!task) {
    return 'Seleccioná una tarea para editarla desde el panel lateral.'
  }

  return `${task.nombre} · ${task.fechaInicio} → ${task.fechaFin}`
}

export function GanttHeader({
  obraNombre,
  selectedTask,
  metadata,
  onBack,
  onCreateTask,
  onOpenPrintOptions,
}: GanttHeaderProps) {
  const summary = buildSummary(selectedTask)

  return (
    <header className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Volver a obras"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0 space-y-1.5">
              <h1 className="truncate text-[2rem] font-semibold leading-none text-slate-900">{obraNombre}</h1>
              <p className="text-sm text-slate-600">{metadata}</p>
              <p className="truncate text-sm text-slate-500">{summary}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCreateTask}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Plus size={16} />
            Nueva tarea
          </button>
          <button
            type="button"
            onClick={onOpenPrintOptions}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FileDown size={16} />
            Exportar
          </button>
        </div>
      </div>
    </header>
  )
}
