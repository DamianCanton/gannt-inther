import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GanttInteractive } from '@/components/gantt/gantt-interactive'
import { deserializePrintConfig } from '@/components/gantt/print-projection'
import type { ScheduleTask } from '@/types/gantt'

const initialSchedule: ScheduleTask[] = [
  {
    id: 'A',
    projectId: 'p1',
    obraId: 'o1',
    nombre: 'Cimentación',
    duracionDias: 2,
    dependeDeId: null,
    orden: 1,
    fechaInicio: '2026-04-06',
    fechaFin: '2026-04-07',
  },
  {
    id: 'B',
    projectId: 'p1',
    obraId: 'o1',
    nombre: 'Estructura',
    duracionDias: 3,
    dependeDeId: 'A',
    orden: 2,
    fechaInicio: '2026-04-08',
    fechaFin: '2026-04-10',
  },
]

const flatScheduleWithLegacyNames: ScheduleTask[] = [
  {
    id: 'P1',
    projectId: 'p1',
    obraId: 'o1',
    nombre: 'Padre',
    duracionDias: 5,
    dependeDeId: null,
    orden: 1,
    fechaInicio: '2026-04-06',
    fechaFin: '2026-04-10',
  },
  {
    id: 'C1',
    projectId: 'p1',
    obraId: 'o1',
    nombre: 'Hija',
    duracionDias: 2,
    dependeDeId: null,
    orden: 2,
    fechaInicio: '2026-04-07',
    fechaFin: '2026-04-08',
  },
]

describe('interactive gantt integration', () => {
  afterEach(() => cleanup())

  it('renders redesigned compact header and toolbar controls', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        onMutateTask={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /Volver a obras/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nueva tarea' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Días' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Semanas' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mes' })).toBeTruthy()
    expect(screen.getByLabelText('Buscar tarea')).toBeTruthy()
  })

  it('opens drawer in creation mode from + Nueva tarea', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        onMutateTask={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    expect(screen.getByRole('heading', { name: 'Nueva tarea' })).toBeTruthy()
    expect(screen.getByLabelText('Nombre')).toBeTruthy()
  })

  it('opens edit drawer after selecting a row', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        onMutateTask={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: /Estructura/ })[0]!)
    expect(screen.getByRole('heading', { name: 'Editar tarea' })).toBeTruthy()
    expect(screen.getAllByText('Estructura').length).toBeGreaterThan(0)
  })

  it('does not show collapse controls in flat mode', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={flatScheduleWithLegacyNames}
        onMutateTask={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /Hija · 2026-04-07 → 2026-04-08/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Contraer/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Expandir/i })).toBeNull()
    expect(screen.queryByText(/Tarea principal/i)).toBeNull()
    expect(screen.queryByText(/Subtarea/i)).toBeNull()
  })

  it('creates a task and reconciles with server schedule', async () => {
    const saveMock = vi.fn(async () => ({
      schedule: [
        ...initialSchedule,
        {
          id: 'C',
          projectId: 'p1',
          obraId: 'o1',
          nombre: 'Terminaciones',
          duracionDias: 2,
          dependeDeId: 'B',
          orden: 3,
          fechaInicio: '2026-04-13',
          fechaFin: '2026-04-14',
        },
      ] satisfies ScheduleTask[],
    }))

    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        onMutateTask={saveMock}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Terminaciones' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText('Terminaciones').length).toBeGreaterThan(0)
    })
  })

  it('shows save error and keeps committed schedule on rejected mutation', async () => {
    const saveMock = vi.fn(async () => ({
      error: {
        code: 'VALIDATION_ERROR' as const,
        message: 'La dependencia crea un ciclo inválido.',
      },
    }))

    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        onMutateTask={saveMock}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: /Estructura/ })[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getAllByText('La dependencia crea un ciclo inválido.').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Estructura').length).toBeGreaterThan(0)
    })
  })

  it('renders empty state and allows creating first task', async () => {
    const saveMock = vi.fn(async () => ({
      schedule: [
        {
          id: 'N1',
          projectId: 'p1',
          obraId: 'o1',
          nombre: 'Primera tarea',
          duracionDias: 1,
          dependeDeId: null,
          orden: 1,
          fechaInicio: '2026-04-06',
          fechaFin: '2026-04-06',
        },
      ] satisfies ScheduleTask[],
    }))

    render(
      <GanttInteractive
        obraNombre="Obra Vacía"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={[]}
        onMutateTask={saveMock}
      />
    )

    expect(screen.getByText('Todavía no hay tareas cargadas.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Primera tarea' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText('Primera tarea').length).toBeGreaterThan(0)
    })
  })

  it('supports print handoff config serialization', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        onMutateTask={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir vista de impresión' }))

    const openedUrl = openSpy.mock.calls[0]?.[0]
    const parsedUrl = new URL(openedUrl as string, 'https://example.test')
    const encodedConfig = parsedUrl.searchParams.get('config')
    const config = deserializePrintConfig(encodedConfig)
    expect(config.selectionMode).toBe('visible')
  })

  it('shows blocking error state when initial schedule is unavailable', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        initialScheduleError="No se pudo cargar la obra."
        onMutateTask={vi.fn()}
      />
    )

    expect(screen.getByText('No se pudo cargar la obra.')).toBeTruthy()
    expect(screen.queryByText('Editor de tarea')).toBeNull()
  })
})
