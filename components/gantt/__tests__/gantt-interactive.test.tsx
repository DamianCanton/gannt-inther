import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ScheduleTask } from '@/types/gantt'
import { GanttInteractive } from '@/components/gantt/gantt-interactive'

function makeTask(overrides: Partial<ScheduleTask>): ScheduleTask {
  return {
    id: overrides.id ?? 'T1',
    projectId: overrides.projectId ?? 'p1',
    obraId: overrides.obraId ?? 'o1',
    nombre: overrides.nombre ?? 'Tarea',
    duracionDias: overrides.duracionDias ?? 3,
    dependeDeId: overrides.dependeDeId ?? null,
    orden: overrides.orden ?? 1,
    fechaInicio: overrides.fechaInicio ?? '2026-04-06',
    fechaFin: overrides.fechaFin ?? '2026-04-08',
  }
}

describe('GanttInteractive filters contract', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows advanced filter controls for duration, dependencies, dates and visibility', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Filtros"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={[
          makeTask({ id: 'A1', nombre: 'Fundaciones', duracionDias: 8 }),
          makeTask({ id: 'B1', nombre: 'Instalación', duracionDias: 2, dependeDeId: 'A1', orden: 2 }),
        ]}
        onMutateTask={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))

    expect(screen.getByLabelText('Duración mínima (días)')).toBeTruthy()
    expect(screen.getByLabelText('Duración máxima (días)')).toBeTruthy()
    expect(screen.getByLabelText('Con dependencias')).toBeTruthy()
    expect(screen.getByLabelText('Fecha desde')).toBeTruthy()
    expect(screen.getByLabelText('Fecha hasta')).toBeTruthy()
    expect(screen.getByLabelText('Solo tareas visibles')).toBeTruthy()
  })

  it('renders an empty result state when no task matches active filters', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Filtros"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={[
          makeTask({ id: 'A1', nombre: 'Fundaciones', duracionDias: 8 }),
          makeTask({ id: 'B1', nombre: 'Instalación', duracionDias: 2, dependeDeId: 'A1', orden: 2 }),
        ]}
        onMutateTask={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Buscar tarea…'), {
      target: { value: 'No existe' },
    })

    expect(screen.getByText('No hay tareas que coincidan con los filtros activos.')).toBeTruthy()
  })
})
