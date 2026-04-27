import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ScheduleTask } from '@/types/gantt'

import { GanttInteractive } from '../gantt-interactive'
import { TaskEditor } from '../task-editor'

afterEach(() => cleanup())

const makeTask = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
  id: overrides.id ?? 'task-1',
  projectId: overrides.projectId ?? 'project-1',
  obraId: overrides.obraId ?? 'obra-1',
  nombre: overrides.nombre ?? 'Tarea',
  duracionDias: overrides.duracionDias ?? 1,
  dependeDeId: overrides.dependeDeId ?? null,
  parentId: overrides.parentId ?? null,
  offsetDias: overrides.offsetDias ?? 0,
  orden: overrides.orden ?? 1,
  fechaInicio: overrides.fechaInicio ?? '2026-04-06',
  fechaFin: overrides.fechaFin ?? '2026-04-06',
})

describe('TaskEditor UX simplification', () => {
  it('starts with advanced fields hidden in create mode and reveals them on demand', () => {
    render(<TaskEditor mode="create" tasks={[makeTask({ id: 'a' })]} onSubmit={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: 'Dependencia' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Subtareas / Grupo' })).toBeNull()
    expect(screen.queryByLabelText('Offset (días hábiles)')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar opciones avanzadas' }))

    expect(screen.getByRole('combobox', { name: 'Dependencia' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Subtareas / Grupo' })).toBeTruthy()
    expect(screen.getByLabelText('Offset (días hábiles)')).toBeTruthy()
  })

  it('auto-expands advanced controls when editing a task with hierarchy/dependency/offset', () => {
    const parentTask = makeTask({ id: 'p1', nombre: 'Padre' })
    const selectedTask = makeTask({
      id: 't2',
      nombre: 'Subtarea compleja',
      parentId: 'p1',
      dependeDeId: null,
      offsetDias: 2,
    })

    render(
      <TaskEditor
        mode="edit"
        tasks={[parentTask, selectedTask]}
        selectedTaskId={selectedTask.id}
        selectedTask={selectedTask}
        onSelectTask={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]!)

    const advancedToggle = screen.getByRole('button', { name: 'Ocultar opciones avanzadas' })
    expect(advancedToggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('combobox', { name: 'Dependencia' })).toBeTruthy()
  })

  it('keeps dependency visible by default when editing a task with only dependency data', () => {
    const dependencyTask = makeTask({ id: 'dep-1' })
    const selectedTask = makeTask({
      id: 't3',
      nombre: 'Dependiente',
      dependeDeId: 'dep-1',
      parentId: null,
      offsetDias: 0,
    })

    render(
      <TaskEditor
        mode="edit"
        tasks={[dependencyTask, selectedTask]}
        selectedTaskId={selectedTask.id}
        selectedTask={selectedTask}
        onSelectTask={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]!)

    expect(screen.getByRole('combobox', { name: 'Dependencia' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Subtareas / Grupo' })).toBeNull()
    expect(screen.queryByLabelText('Offset (días hábiles)')).toBeNull()
  })

  it('uses a touch-friendly help trigger and clearer hierarchy copy', () => {
    render(<TaskEditor mode="create" tasks={[makeTask({ id: 'a' })]} onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar opciones avanzadas' }))

    const helpButton = screen.getByRole('button', { name: 'Ayuda para Subtareas o Grupo' })
    expect(helpButton.className).toContain('h-11')
    expect(helpButton.className).toContain('w-11')

    fireEvent.click(helpButton)

    expect(
      screen.getByText(/Cuando una tarea tiene padre, pasa a ser subtarea del grupo y su planificación se ordena dentro de ese bloque/i)
    ).toBeTruthy()
    expect(
      screen.getByText(/Si no tiene padre, queda como tarea base y puede usar dependencia externa para arrancar después de otra/i)
    ).toBeTruthy()
  })

  it('keeps long hierarchy help readable on narrow viewport without hiding the form model', () => {
    const previousInnerWidth = window.innerWidth
    window.innerWidth = 320
    window.dispatchEvent(new Event('resize'))

    try {
      render(<TaskEditor mode="create" tasks={[makeTask({ id: 'a' })]} onSubmit={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: 'Mostrar opciones avanzadas' }))
      fireEvent.click(screen.getByRole('button', { name: 'Ayuda para Subtareas o Grupo' }))

      expect(
        screen.getByText(/Cuando una tarea tiene padre, pasa a ser subtarea del grupo y su planificación se ordena dentro de ese bloque/i)
      ).toBeTruthy()
      expect(screen.getByText(/Si no tiene padre, queda como tarea base y puede usar dependencia externa para arrancar después de otra/i)).toBeTruthy()
      expect(screen.getByText(/Si la tarea tiene padre, se vuelve subtarea\. Sin padre queda en nivel superior\./i)).toBeTruthy()
    } finally {
      window.innerWidth = previousInnerWidth
      window.dispatchEvent(new Event('resize'))
    }
  })
})

describe('GanttInteractive responsiveness', () => {
  it('uses mobile-safe container padding for the main layout', () => {
    const onMutateTask = vi.fn(async () => ({ schedule: [] }))
    const { container } = render(
      <GanttInteractive
        obraNombre="Obra prueba"
        projectId="project-1"
        obraId="obra-1"
        obraStartDate="2026-04-06"
        printHref="/obra/obra-1/print"
        initialSchedule={[]}
        onMutateTask={onMutateTask}
      />
    )

    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('p-4')
    expect(root.className).toContain('md:p-6')
  })
})
