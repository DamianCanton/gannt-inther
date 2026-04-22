import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ScheduleTask } from '@/types/gantt'

import { TaskEditor } from '../task-editor'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeScheduleTask = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
  id: overrides.id ?? 'task',
  projectId: overrides.projectId ?? 'p1',
  obraId: overrides.obraId ?? 'o1',
  nombre: overrides.nombre ?? 'Task',
  duracionDias: overrides.duracionDias ?? 1,
  dependeDeId: overrides.dependeDeId ?? null,
  orden: overrides.orden ?? 1,
  fechaInicio: overrides.fechaInicio ?? '2026-04-06',
  fechaFin: overrides.fechaFin ?? '2026-04-06',
})

const conflictScenario = (): ScheduleTask[] => [
  makeScheduleTask({
    id: 'A',
    nombre: 'Fase 1',
    dependeDeId: null,
    orden: 1,
    fechaInicio: '2026-04-06',
    fechaFin: '2026-04-07',
  }),
  makeScheduleTask({
    id: 'B',
    nombre: 'Fase 2',
    dependeDeId: 'A',
    orden: 2,
    fechaInicio: '2026-04-08',
    fechaFin: '2026-04-10',
  }),
]

const noConflictScenario = (): ScheduleTask[] => [
  makeScheduleTask({
    id: 'A',
    nombre: 'Fase 1',
    dependeDeId: null,
    orden: 1,
    fechaInicio: '2026-04-06',
    fechaFin: '2026-04-07',
  }),
]

// ---------------------------------------------------------------------------
// Tests: Confirmation-Gated Persistence
// ---------------------------------------------------------------------------

describe('TaskEditor — smart-insert confirmation-gated persistence', () => {
  afterEach(() => cleanup())

  it('does NOT call onSubmit when user cancels the conflict modal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const tasks = conflictScenario()

    const { container } = render(
      <TaskEditor mode="create" tasks={tasks} onSubmit={onSubmit} />
    )

    const form = container.querySelector('form')!

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nueva' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /Depende de/ }), {
      target: { value: 'A' },
    })

    fireEvent.submit(form)

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Conflicto de dependencia')).toBeTruthy()
    })

    // onSubmit must NOT have been called (conflict blocked)
    expect(onSubmit).not.toHaveBeenCalled()

    // Cancel — clears pending state, no submit
    fireEvent.click(screen.getByText('Cancelar'))

    await waitFor(() => {
      expect(screen.queryByText('Conflicto de dependencia')).toBeNull()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does NOT call onSubmit when user closes the dialog', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const tasks = conflictScenario()

    const { container } = render(
      <TaskEditor mode="create" tasks={tasks} onSubmit={onSubmit} />
    )

    const form = container.querySelector('form')!

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nueva' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /Depende de/ }), {
      target: { value: 'A' },
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Conflicto de dependencia')).toBeTruthy()
    })

    // Close via X button
    fireEvent.click(screen.getByLabelText('Cerrar'))

    await waitFor(() => {
      expect(screen.queryByText('Conflicto de dependencia')).toBeNull()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('allows normal submit when there is no conflict (no modal)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const tasks = noConflictScenario()

    const { container } = render(
      <TaskEditor mode="create" tasks={tasks} onSubmit={onSubmit} />
    )

    const form = container.querySelector('form')!

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nueva' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /Depende de/ }), {
      target: { value: 'A' },
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    // No modal
    expect(screen.queryByText('Conflicto de dependencia')).toBeNull()

    // Payload has no smartInsert
    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload).toBeDefined()
    expect(payload.intent).toBe('create')
    expect(payload.smartInsert).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Tests: Edit Flow Preserves User Intent
// ---------------------------------------------------------------------------

describe('TaskEditor — edit flow preserves user intent', () => {
  afterEach(() => cleanup())

  it('injects smartInsert strategy "insert" when user picks Insertar', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const tasks = conflictScenario()

    const { container } = render(
      <TaskEditor mode="create" tasks={tasks} onSubmit={onSubmit} />
    )

    const form = container.querySelector('form')!

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nueva' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /Depende de/ }), {
      target: { value: 'A' },
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Conflicto de dependencia')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Insertar (encadenar)'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload).toBeDefined()
    expect(payload.intent).toBe('create')
    expect(payload.smartInsert).toBeDefined()
    expect(payload.smartInsert.strategy).toBe('insert')
    expect(payload.smartInsert.conflictParentId).toBe('A')
    expect(payload.smartInsert.conflictChildId).toBe('B')
  })

  it('injects smartInsert strategy "branch" when user picks Ramificar', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const tasks = conflictScenario()

    const { container } = render(
      <TaskEditor mode="create" tasks={tasks} onSubmit={onSubmit} />
    )

    const form = container.querySelector('form')!

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nueva' } })
    fireEvent.change(screen.getByLabelText('Duración (días hábiles)'), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /Depende de/ }), {
      target: { value: 'A' },
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Conflicto de dependencia')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Ramificar (paralelo)'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload).toBeDefined()
    expect(payload.intent).toBe('create')
    expect(payload.smartInsert).toBeDefined()
    expect(payload.smartInsert.strategy).toBe('branch')
    expect(payload.smartInsert.conflictParentId).toBe('A')
    expect(payload.smartInsert.conflictChildId).toBe('B')
  })

  it('edit mode: excludeTaskId prevents false conflict for existing dep', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const tasks = conflictScenario()

    const selectedTask = tasks[1]! // B

    const { container } = render(
      <TaskEditor
        mode="edit"
        tasks={tasks}
        selectedTaskId="B"
        selectedTask={selectedTask}
        onSelectTask={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    // Switch to edit mode
    fireEvent.click(screen.getByText('Editar'))

    // Set the dependency to A (same as B's existing dep)
    fireEvent.change(screen.getByRole('combobox', { name: /Depende de/ }), {
      target: { value: 'A' },
    })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    // No modal — excludeTaskId prevented false conflict for B's existing dep on A
    expect(screen.queryByText('Conflicto de dependencia')).toBeNull()

    // The submitted payload should have no smartInsert
    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload).toBeDefined()
    expect(payload.intent).toBe('update')
    expect(payload.smartInsert).toBeUndefined()
  })
})
