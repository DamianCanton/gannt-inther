import { describe, expect, it, vi } from 'vitest'

import { GanttRepo, RepoAccessError } from '@/lib/repositories/gantt-repo'

describe('gantt-repo phase 5 methods', () => {
  it('calls mutate_task_graph RPC with typed payload and returns task id', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: 'task-123', error: null })
    const supabaseMock = {
      rpc: rpcMock,
    }

    const repo = new GanttRepo(supabaseMock as never)

    const result = await repo.mutateTaskGraphAtomic({
      projectId: 'p1',
      obraId: 'o1',
      intent: 'update',
      taskId: 'task-123',
      payload: {
        nombre: 'Nueva tarea',
        duracion_dias: 3,
        depende_de_id: 'task-100',
      },
    })

    expect(result).toBe('task-123')
    expect(rpcMock).toHaveBeenCalledWith('mutate_task_graph', {
      intent: 'update',
      obra_id: 'o1',
      task_id: 'task-123',
      payload: {
        nombre: 'Nueva tarea',
        duracion_dias: 3,
        depende_de_id: 'task-100',
      },
    })
  })

  it('maps rpc failure to domain mutation error', async () => {
    const supabaseMock = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DEPENDENCY_CYCLE', code: 'P0001' },
      }),
    }

    const repo = new GanttRepo(supabaseMock as never)

    await expect(
      repo.mutateTaskGraphAtomic({
        projectId: 'p1',
        obraId: 'o1',
        intent: 'update',
        taskId: 'task-123',
        payload: { depende_de_id: 'task-100' },
      })
    ).rejects.toMatchObject({
      code: 'DEPENDENCY_CYCLE',
    })
  })

  it('creates obra under server-derived project scope', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'obra-1' }, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })

    const supabaseMock = {
      from: fromMock,
    }

    const repo = new GanttRepo(supabaseMock as never)

    const obraId = await repo.createObra({
      projectId: 'p-auth',
      input: {
        nombre: 'Obra Norte',
        cliente: 'Cliente SA',
        tipoObra: 'SPLIT',
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
      },
    })

    expect(obraId).toBe('obra-1')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'p-auth',
        nombre: 'Obra Norte',
      })
    )
  })

  it('throws FORBIDDEN_OR_NOT_FOUND style access error when deleting missing obra', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const eqIdMock = vi.fn().mockReturnValue({ select: selectMock })
    const eqProjectMock = vi.fn().mockReturnValue({ eq: eqIdMock })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqProjectMock })
    const fromMock = vi.fn().mockReturnValue({ delete: deleteMock })

    const supabaseMock = {
      from: fromMock,
    }

    const repo = new GanttRepo(supabaseMock as never)

    await expect(repo.deleteObra({ projectId: 'p-auth', obraId: 'o-missing' })).rejects.toBeInstanceOf(
      RepoAccessError
    )
  })

  it('saveTask persists flat payload only (without hierarchy fields)', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })

    const supabaseMock = {
      from: fromMock,
    }

    const repo = new GanttRepo(supabaseMock as never)

    await repo.saveTask({
      projectId: 'p-auth',
      obraId: 'o-1',
      task: {
        id: 't-1',
        projectId: 'p-auth',
        obraId: 'o-1',
        nombre: 'Tarea plana',
        duracionDias: 3,
        dependeDeId: 't-0',
        orden: 10,
      },
    })

    const upsertPayload = upsertMock.mock.calls[0]?.[0]
    expect(upsertPayload).toMatchObject({
      id: 't-1',
      project_id: 'p-auth',
      obra_id: 'o-1',
      nombre: 'Tarea plana',
      duracion_dias: 3,
      depende_de_id: 't-0',
      orden: 10,
    })
    expect(upsertPayload).not.toHaveProperty('parent_id')
    expect(upsertPayload).not.toHaveProperty('offset_dias')
  })
})
