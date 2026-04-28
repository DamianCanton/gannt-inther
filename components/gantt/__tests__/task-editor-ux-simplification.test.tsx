import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ScheduleTask } from '@/types/gantt'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

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
  orden: overrides.orden ?? 1,
  fechaInicio: overrides.fechaInicio ?? '2026-04-06',
  fechaFin: overrides.fechaFin ?? '2026-04-06',
})

describe('TaskEditor UX simplification', () => {
  it('shows only flat-task controls in create mode (no hierarchy toggles)', () => {
    render(<TaskEditor mode="create" tasks={[makeTask({ id: 'a' })]} onSubmit={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: 'Dependencia' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Subtareas / Grupo' })).toBeNull()
    expect(screen.queryByLabelText('Offset (días hábiles)')).toBeNull()
    expect(screen.queryByRole('button', { name: /opciones avanzadas/i })).toBeNull()
  })

  it('keeps edit mode in flat-task controls only', () => {
    const parentTask = makeTask({ id: 'p1', nombre: 'Padre' })
    const selectedTask = makeTask({
      id: 't2',
      nombre: 'Subtarea compleja',
      dependeDeId: null,
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

    expect(screen.getByRole('combobox', { name: 'Dependencia' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Subtareas / Grupo' })).toBeNull()
    expect(screen.queryByLabelText('Offset (días hábiles)')).toBeNull()
  })

  it('keeps dependency visible by default when editing a task with only dependency data', () => {
    const dependencyTask = makeTask({ id: 'dep-1' })
    const selectedTask = makeTask({
      id: 't3',
      nombre: 'Dependiente',
      dependeDeId: 'dep-1',
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

  it('does not render hierarchy help/actions in flat mode', () => {
    render(<TaskEditor mode="create" tasks={[makeTask({ id: 'a' })]} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Ayuda para Subtareas o Grupo' })).toBeNull()
    expect(screen.queryByText(/subtarea/i)).toBeNull()
  })

  it('does not show hierarchy model copy on narrow viewport either', () => {
    const previousInnerWidth = window.innerWidth
    window.innerWidth = 320
    window.dispatchEvent(new Event('resize'))

    try {
      render(<TaskEditor mode="create" tasks={[makeTask({ id: 'a' })]} onSubmit={vi.fn()} />)

      expect(screen.queryByText(/si la tarea tiene padre/i)).toBeNull()
      expect(screen.queryByText(/subtarea/i)).toBeNull()
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
