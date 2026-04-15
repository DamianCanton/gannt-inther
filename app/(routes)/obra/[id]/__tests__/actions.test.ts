import { afterEach, describe, expect, it, vi } from 'vitest'

import { mutateTask, saveTaskChange } from '@/app/(routes)/obra/[id]/actions'
import { AuthContextError } from '@/lib/auth/auth-context'
import { RepoAccessError } from '@/lib/repositories/gantt-repo'
import type { ObraSchedule } from '@/types/gantt'

const {
  requireAuthContextMock,
  getObraScheduleMock,
  mutateTaskGraphAtomicMock,
} = vi.hoisted(() => ({
  requireAuthContextMock: vi.fn(),
  getObraScheduleMock: vi.fn<() => Promise<ObraSchedule>>(),
  mutateTaskGraphAtomicMock: vi.fn(),
}))

vi.mock('@/lib/auth/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth/auth-context')
  return {
    ...actual,
    requireAuthContext: requireAuthContextMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({ mocked: true }),
}))

vi.mock('@/lib/repositories/gantt-repo', async () => {
  const actual = await vi.importActual('@/lib/repositories/gantt-repo')
  return {
    ...actual,
    GanttRepo: class {
      getObraSchedule = getObraScheduleMock
      mutateTaskGraphAtomic = mutateTaskGraphAtomicMock
    },
  }
})

function createScheduleFixture(projectId = 'p-auth', obraId = 'o1'): ObraSchedule {
  return {
    obra: {
      id: obraId,
      projectId,
      nombre: 'Obra',
      cliente: null,
      tipoObra: 'Tipo A',
      fechaInicioGlobal: '2026-04-06',
      vigenciaTexto: null,
    },
    tasks: [
      {
        id: 't1',
        projectId,
        obraId,
        nombre: 'Tarea 1',
        duracionDias: 2,
        dependeDeId: null,
        orden: 1,
      },
    ],
    dependencies: [],
    holidays: new Set(),
  }
}

describe('saveTaskChange action', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('infers project scope from auth context (ignores client project id)', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p-auth' })
    getObraScheduleMock.mockResolvedValue(createScheduleFixture())
    mutateTaskGraphAtomicMock.mockResolvedValue('t1')

    const result = await saveTaskChange({
      obraId: 'o1',
      taskId: 't1',
      nombre: 'Tarea 1 editada',
      duracionDias: 3,
      dependeDeId: null,
    })

    expect(result.error).toBeUndefined()
    expect(getObraScheduleMock).toHaveBeenCalledWith({ projectId: 'p-auth', obraId: 'o1' })
    expect(mutateTaskGraphAtomicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p-auth',
        obraId: 'o1',
        intent: 'update',
        taskId: 't1',
      })
    )
  })

  it('returns UNAUTHENTICATED when auth context fails', async () => {
    requireAuthContextMock.mockRejectedValue(
      new AuthContextError('UNAUTHENTICATED', 'session missing')
    )

    const result = await saveTaskChange({
      obraId: 'o1',
      taskId: 't1',
      nombre: 'Tarea 1',
      duracionDias: 2,
      dependeDeId: null,
    })

    expect(result.error).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'session missing',
    })
  })

  it('returns FORBIDDEN_OR_NOT_FOUND when obra is outside user scope', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p-auth' })
    getObraScheduleMock.mockRejectedValue(new RepoAccessError('forbidden'))

    const result = await saveTaskChange({
      obraId: 'o1',
      taskId: 't1',
      nombre: 'Tarea 1',
      duracionDias: 2,
      dependeDeId: null,
    })

    expect(result.error).toEqual({
      code: 'FORBIDDEN_OR_NOT_FOUND',
      message: 'forbidden',
    })
  })

  it('does not trust client obra scope in update when requested obra is out of membership scope', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p-auth' })
    getObraScheduleMock.mockRejectedValue(new RepoAccessError('forbidden'))

    const result = await mutateTask({
      intent: 'update',
      obraId: 'o-cross-scope',
      taskId: 't1',
      nombre: 'Intento inválido',
      duracionDias: 2,
      dependeDeId: null,
    })

    expect(result.error).toEqual({
      code: 'FORBIDDEN_OR_NOT_FOUND',
      message: 'forbidden',
    })
    expect(mutateTaskGraphAtomicMock).not.toHaveBeenCalled()
  })

  it('handles create intent through unified mutateTask action', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p-auth' })
    const before = createScheduleFixture('p-auth', 'o1')
    const after: ObraSchedule = {
      ...before,
      tasks: [
        ...before.tasks,
        {
          id: 't2',
          projectId: 'p-auth',
          obraId: 'o1',
          nombre: 'Tarea nueva',
          duracionDias: 3,
          dependeDeId: 't1',
          orden: 2,
        },
      ],
      dependencies: [{ taskId: 't2', dependsOnTaskId: 't1', kind: 'FS' }],
    }

    getObraScheduleMock.mockResolvedValueOnce(before).mockResolvedValueOnce(after)
    mutateTaskGraphAtomicMock.mockResolvedValue('t2')

    const result = await mutateTask({
      intent: 'create',
      obraId: 'o1',
      nombre: 'Tarea nueva',
      duracionDias: 3,
      dependeDeId: 't1',
    })

    expect(result.error).toBeUndefined()
    expect(result.schedule).toBeDefined()
    expect(mutateTaskGraphAtomicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p-auth',
        obraId: 'o1',
        intent: 'create',
      })
    )
  })

  it('handles delete intent through unified mutateTask action', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p-auth' })
    const before: ObraSchedule = {
      ...createScheduleFixture('p-auth', 'o1'),
      tasks: [
        {
          id: 't1',
          projectId: 'p-auth',
          obraId: 'o1',
          nombre: 'Tarea 1',
          duracionDias: 2,
          dependeDeId: null,
          orden: 1,
        },
        {
          id: 't2',
          projectId: 'p-auth',
          obraId: 'o1',
          nombre: 'Tarea 2',
          duracionDias: 2,
          dependeDeId: 't1',
          orden: 2,
        },
      ],
      dependencies: [{ taskId: 't2', dependsOnTaskId: 't1', kind: 'FS' }],
    }
    const after: ObraSchedule = {
      ...before,
      tasks: [
        {
          id: 't2',
          projectId: 'p-auth',
          obraId: 'o1',
          nombre: 'Tarea 2',
          duracionDias: 2,
          dependeDeId: null,
          orden: 1,
        },
      ],
      dependencies: [],
    }

    getObraScheduleMock.mockResolvedValueOnce(before).mockResolvedValueOnce(after)
    mutateTaskGraphAtomicMock.mockResolvedValue('t1')

    const result = await mutateTask({
      intent: 'delete',
      obraId: 'o1',
      taskId: 't1',
    })

    expect(result.error).toBeUndefined()
    expect(mutateTaskGraphAtomicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p-auth',
        obraId: 'o1',
        intent: 'delete',
        taskId: 't1',
      })
    )
    expect(result.schedule?.map((task) => ({ id: task.id, orden: task.orden }))).toEqual([
      { id: 't2', orden: 1 },
    ])
  })

  it('returns ATOMIC_WRITE_FAILED and stops after rpc failure', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p-auth' })
    getObraScheduleMock.mockResolvedValue(createScheduleFixture())
    mutateTaskGraphAtomicMock.mockRejectedValue(new Error('database unavailable'))

    const result = await saveTaskChange({
      obraId: 'o1',
      taskId: 't1',
      nombre: 'Tarea 1',
      duracionDias: 2,
      dependeDeId: null,
    })

    expect(result.error).toEqual({
      code: 'ATOMIC_WRITE_FAILED',
      message: 'No se pudo guardar el cambio: database unavailable',
    })
    expect(getObraScheduleMock).toHaveBeenCalledTimes(1)
    expect(mutateTaskGraphAtomicMock).toHaveBeenCalledTimes(1)
  })

  it('recalculates schedule from canonical dependencies when persisted dependency rows are stale', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p-auth' })

    const current: ObraSchedule = {
      ...createScheduleFixture('p-auth', 'o1'),
      tasks: [
        {
          id: 't1',
          projectId: 'p-auth',
          obraId: 'o1',
          nombre: 'Tarea 1',
          duracionDias: 2,
          dependeDeId: null,
          orden: 1,
        },
        {
          id: 't2',
          projectId: 'p-auth',
          obraId: 'o1',
          nombre: 'Tarea 2',
          duracionDias: 1,
          dependeDeId: 't1',
          orden: 2,
        },
      ],
      dependencies: [{ taskId: 't2', dependsOnTaskId: 't1', kind: 'FS' }],
    }

    const persistedWithStaleDependencyRows: ObraSchedule = {
      ...current,
      dependencies: [],
    }

    getObraScheduleMock
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(persistedWithStaleDependencyRows)
    mutateTaskGraphAtomicMock.mockResolvedValue('t2')

    const result = await mutateTask({
      intent: 'update',
      obraId: 'o1',
      taskId: 't2',
      nombre: 'Tarea 2',
      duracionDias: 1,
      dependeDeId: 't1',
    })

    const byId = new Map(result.schedule?.map((task) => [task.id, task]))
    expect(result.error).toBeUndefined()
    expect(byId.get('t1')?.fechaInicio).toBe('2026-04-06')
    expect(byId.get('t1')?.fechaFin).toBe('2026-04-07')
    expect(byId.get('t2')?.fechaInicio).toBe('2026-04-08')
  })
})
