'use client'

import { GanttInteractive } from '@/components/gantt/gantt-interactive'
import type { GanttEditIntent } from '@/components/gantt/gantt-types'
import type { ScheduleTask } from '@/types/gantt'

const previewSchedule = [
  {
    id: 'task-1',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 'Excavación y cimentación',
    duracionDias: 7,
    dependeDeId: null,
    orden: 1,
    fechaInicio: '2026-04-17',
    fechaFin: '2026-04-27',
  },
  {
    id: 'task-2',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 't1',
    duracionDias: 4,
    dependeDeId: null,
    orden: 2,
    fechaInicio: '2026-04-17',
    fechaFin: '2026-04-22',
  },
  {
    id: 'task-3',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 't1.1',
    duracionDias: 1,
    dependeDeId: null,
    orden: 3,
    fechaInicio: '2026-04-21',
    fechaFin: '2026-04-21',
  },
  {
    id: 'task-3-1',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 't1.2',
    duracionDias: 2,
    dependeDeId: null,
    orden: 4,
    fechaInicio: '2026-04-21',
    fechaFin: '2026-04-22',
  },
  {
    id: 'task-3-2',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 'Instalaciones eléctricas',
    duracionDias: 8,
    dependeDeId: 'task-1',
    orden: 5,
    fechaInicio: '2026-04-28',
    fechaFin: '2026-05-07',
  },
  {
    id: 'task-4',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 'Revestimientos',
    duracionDias: 10,
    dependeDeId: 'task-3',
    orden: 6,
    fechaInicio: '2026-04-28',
    fechaFin: '2026-05-11',
  },
  {
    id: 'task-5',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 'Estructura metálica',
    duracionDias: 12,
    dependeDeId: 'task-4',
    orden: 7,
    fechaInicio: '2026-05-13',
    fechaFin: '2026-05-28',
  },
  {
    id: 'task-6',
    projectId: 'preview-project',
    obraId: 'preview-obra',
    nombre: 'Inspección final',
    duracionDias: 3,
    dependeDeId: 'task-5',
    orden: 8,
    fechaInicio: '2026-05-29',
    fechaFin: '2026-06-02',
  },
] satisfies ScheduleTask[]

async function previewMutateTask(_payload: GanttEditIntent & { obraId: string }) {
  return { schedule: previewSchedule }
}

export default function PreviewInteractiveGanttPage() {
  return (
    <div className="min-h-screen bg-slate-100/80">
      <GanttInteractive
        obraNombre="teco 3"
        projectId="preview-project"
        obraId="preview-obra"
        obraStartDate="2026-04-17"
        printHref="/obra/preview-obra/print"
        initialSchedule={previewSchedule}
        onMutateTask={previewMutateTask}
      />
    </div>
  )
}
