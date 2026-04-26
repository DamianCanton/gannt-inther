import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ObraPage from '@/app/(routes)/obra/[id]/page'
import { AuthContextError } from '@/lib/auth/auth-context'
import type { ObraSchedule } from '@/types/gantt'

const {
  getObraScheduleMock,
  createScheduleWithDetailsMock,
  ensureObraAccessMock,
} = vi.hoisted(() => ({
  getObraScheduleMock: vi.fn<() => Promise<ObraSchedule>>(),
  createScheduleWithDetailsMock: vi.fn(),
  ensureObraAccessMock: vi.fn(),
}))

const notFoundMock = vi.hoisted(() => vi.fn(() => null))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({ mocked: true }),
}))

vi.mock('@/lib/auth/guards', () => ({
  ensureObraAccess: ensureObraAccessMock,
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

vi.mock('@/lib/repositories/gantt-repo', async () => {
  const actual = await vi.importActual('@/lib/repositories/gantt-repo')
  return {
    ...actual,
    GanttRepo: class {
      getObraSchedule = getObraScheduleMock
    },
  }
})

vi.mock('@/lib/gantt-scheduler', () => ({
  createScheduleWithDetails: createScheduleWithDetailsMock,
}))

describe('/obra/[id] route integration', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('propagates cycle error and suppresses timeline rendering', async () => {
    ensureObraAccessMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    getObraScheduleMock.mockResolvedValue({
      obra: {
        id: 'o1',
        projectId: 'p1',
        nombre: 'Obra Cíclica',
        cliente: null,
        tipoObra: 'Tipo A',
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
      },
      tasks: [
        {
          id: 'A',
          projectId: 'p1',
          obraId: 'o1',
          nombre: 'A',
          duracionDias: 2,
          dependeDeId: 'B',
          orden: 1,
        },
        {
          id: 'B',
          projectId: 'p1',
          obraId: 'o1',
          nombre: 'B',
          duracionDias: 2,
          dependeDeId: 'A',
          orden: 2,
        },
      ],
      dependencies: [
        { taskId: 'A', dependsOnTaskId: 'B', kind: 'FS' },
        { taskId: 'B', dependsOnTaskId: 'A', kind: 'FS' },
      ],
      holidays: new Set(),
    })

    createScheduleWithDetailsMock.mockImplementation(() => {
      throw new Error('CYCLE_DETECTED:A->B->A')
    })

    const page = await ObraPage({ params: { id: 'o1' } })
    render(page)

    expect(screen.getByText('Obra con error de dependencias')).toBeTruthy()
    expect(screen.getByText('Dependencia circular detectada: A -> B -> A')).toBeTruthy()
    expect(screen.queryByText('Guardar cambios')).toBeNull()
  })

  it('maps forbidden access to notFound()', async () => {
    ensureObraAccessMock.mockRejectedValue(
      new AuthContextError('FORBIDDEN_OR_NOT_FOUND', 'forbidden')
    )

    await ObraPage({ params: { id: 'o1' } })

    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })

  it('renders authorized obra happy path for membership-scoped access', async () => {
    ensureObraAccessMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    getObraScheduleMock.mockResolvedValue({
      obra: {
        id: 'o1',
        projectId: 'p1',
        nombre: 'Obra Autorizada',
        cliente: null,
        tipoObra: 'Tipo A',
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
      },
      tasks: [
        {
          id: 't1',
          projectId: 'p1',
          obraId: 'o1',
          nombre: 'Tarea inicial',
          duracionDias: 3,
          dependeDeId: null,
          orden: 1,
        },
      ],
      dependencies: [],
      holidays: new Set(),
    })

    createScheduleWithDetailsMock.mockReturnValue({
      tasks: [
        {
          id: 't1',
          projectId: 'p1',
          obraId: 'o1',
          nombre: 'Tarea inicial',
          duracionDias: 3,
          dependeDeId: null,
          orden: 1,
          fechaInicio: '2026-04-06',
          fechaFin: '2026-04-08',
        },
      ],
      errors: [],
    })

    const page = await ObraPage({ params: { id: 'o1' } })
    render(page)

    expect(screen.getByText('Obra Autorizada')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver gráfico ampliado' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exportar PDF/Imprimir' })).toBeTruthy()
    expect(ensureObraAccessMock).toHaveBeenCalledWith('o1')
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('renders recoverable fetch-failure state and keeps editing controls hidden', async () => {
    ensureObraAccessMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    getObraScheduleMock.mockRejectedValue(new Error('database unavailable'))

    const page = await ObraPage({ params: { id: 'o1' } })
    render(page)

    expect(screen.getByRole('heading', { name: 'Error' })).toBeTruthy()
    expect(screen.getByText('Error cargando obra: database unavailable')).toBeTruthy()
    expect(screen.queryByText('Guardar cambios')).toBeNull()
  })
})
