import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GanttInteractive } from '@/components/gantt/gantt-interactive'
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

const taskA = initialSchedule[0] as ScheduleTask
const taskB = initialSchedule[1] as ScheduleTask

describe('interactive gantt integration', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders selection across list and timeline', () => {
    const noop = vi.fn().mockResolvedValue({})

    render(
      <GanttInteractive
        obraNombre="Obra Demo"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={initialSchedule}
        onMutateTask={noop}
      />
    )

    expect(screen.getByText('Tareas')).toBeTruthy()
    expect(screen.getAllByText('Cimentación').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Estructura').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: /Cimentación/ })[0]!)
    expect(screen.getByText('Cimentación · 2026-04-06 → 2026-04-07')).toBeTruthy()
  })

  it('creates a task and reconciles with the server schedule', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Terminaciones' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Terminaciones · 2026-04-13 → 2026-04-14')).toBeTruthy()
    })
  })

  it('keeps committed schedule visible on rejected mutation', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Tarea'), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getAllByText('La dependencia crea un ciclo inválido.').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Estructura').length).toBeGreaterThan(0)
    })
  })

  it('renders empty state without disabling the timeline frame', () => {
    render(
      <GanttInteractive
        obraNombre="Obra Vacía"
        projectId="p1"
        obraId="o1"
        obraStartDate="2026-04-06"
        printHref="/obra/o1/print"
        initialSchedule={[]}
        onMutateTask={vi.fn()}
      />
    )

    expect(screen.getByText('Todavía no hay tareas cargadas.')).toBeTruthy()
    expect(screen.getByText('La línea de tiempo aparece acá cuando cargues tareas.')).toBeTruthy()
  })

  it('allows creating the first task when schedule is empty', async () => {
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

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Primera tarea' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Primera tarea · 2026-04-06 → 2026-04-06')).toBeTruthy()
    })
  })

  it('disables editing when the server data is unavailable', () => {
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
    expect(screen.getByText('Obra Demo')).toBeTruthy()
    expect(screen.queryByText('Editor de tarea')).toBeNull()
  })

  it('requires delete confirmation before submitting intent', async () => {
    const saveMock = vi.fn(async () => ({ schedule: [taskA] }))

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

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    fireEvent.change(screen.getByLabelText('Tarea'), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar tarea' }))

    expect(saveMock).toHaveBeenCalledTimes(0)
    fireEvent.click(screen.getByLabelText('Confirmo que quiero eliminar esta tarea'))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar tarea' }))

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Obra Demo')).toBeTruthy()
    })
  })

  it('cancels an in-progress edit intent without sending mutations', () => {
    const saveMock = vi.fn(async () => ({ schedule: initialSchedule }))

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

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    fireEvent.change(screen.getByLabelText('Tarea'), { target: { value: 'B' } })

    expect(screen.getByLabelText('Confirmo que quiero eliminar esta tarea')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }))

    expect(screen.queryByLabelText('Confirmo que quiero eliminar esta tarea')).toBeNull()
    expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeTruthy()
    expect(screen.getByText('Seleccioná una tarea para ver sus detalles.')).toBeTruthy()
    expect(saveMock).toHaveBeenCalledTimes(0)
  })

  it('shows visible export CTA with print href', () => {
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

    const exportLink = screen.getByRole('link', { name: 'Exportar PDF/Imprimir' })
    expect(exportLink.getAttribute('href')).toBe('/obra/o1/print')
  })

  it('shows visible pending feedback during mutation', async () => {
    let resolveMutation: ((value: { schedule: ScheduleTask[] }) => void) | null = null
    const saveMock = vi.fn(
      () =>
        new Promise<{ schedule: ScheduleTask[] }>((resolve) => {
          resolveMutation = resolve
        })
    )

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

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pendiente' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    expect(screen.getByText('Guardando cambios en el cronograma...')).toBeTruthy()
    expect(screen.getByText('Creando tarea...')).toBeTruthy()

    if (!resolveMutation) {
      throw new Error('Test setup failed: mutation resolver missing')
    }

    const completeMutation = resolveMutation as (value: { schedule: ScheduleTask[] }) => void
    completeMutation({ schedule: initialSchedule })

    await waitFor(() => {
      expect(screen.queryByText('Guardando cambios en el cronograma...')).toBeNull()
      expect(screen.queryByText('Creando tarea...')).toBeNull()
    })
  })

  it('recovers from thrown submit errors without leaving saving state stuck', async () => {
    const saveMock = vi.fn(async () => {
      throw new Error('network down')
    })

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

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Falla' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    await waitFor(() => {
      expect(screen.getByText('No se pudo crear la tarea. Intentá nuevamente.')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeTruthy()
      expect(screen.queryByText('Creando tarea...')).toBeNull()
    })
  })
})
