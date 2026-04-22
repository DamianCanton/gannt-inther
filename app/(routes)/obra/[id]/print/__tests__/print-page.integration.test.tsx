import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PrintPage from '@/app/(routes)/obra/[id]/print/page'
import { AuthContextError } from '@/lib/auth/auth-context'
import type { ObraSchedule } from '@/types/gantt'

const printMock = vi.hoisted(() => vi.fn())

const {
  ensureObraAccessMock,
  getObraScheduleMock,
  notFoundMock,
  redirectMock,
} = vi.hoisted(() => ({
  ensureObraAccessMock: vi.fn(),
  getObraScheduleMock: vi.fn<() => Promise<ObraSchedule>>(),
  notFoundMock: vi.fn(() => null),
  redirectMock: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  ensureObraAccess: ensureObraAccessMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({ mocked: true }),
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

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}))

describe('/obra/[id]/print route integration', () => {
  Object.defineProperty(window, 'print', {
    writable: true,
    value: printMock,
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders print view for authorized user', async () => {
    ensureObraAccessMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    getObraScheduleMock.mockResolvedValue({
      obra: {
        id: 'o1',
        projectId: 'p1',
        nombre: 'Obra Print',
        cliente: null,
        tipoObra: 'Tipo A',
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
      },
      tasks: [],
      dependencies: [],
      holidays: new Set(),
    })

    const page = await PrintPage({ params: { id: 'o1' } })
    render(page)

    expect(screen.getByText('Obra Print')).toBeTruthy()
    expect(screen.getByText(/impresión/i)).toBeTruthy()
  })

  it('redirects unauthenticated requests', async () => {
    ensureObraAccessMock.mockRejectedValue(
      new AuthContextError('UNAUTHENTICATED', 'login required')
    )

    await PrintPage({ params: { id: 'o1' } })

    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })

  it('returns notFound for forbidden access', async () => {
    ensureObraAccessMock.mockRejectedValue(
      new AuthContextError('FORBIDDEN_OR_NOT_FOUND', 'forbidden')
    )

    await PrintPage({ params: { id: 'o1' } })

    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })

  it('renders sanitized error content on recoverable failures', async () => {
    ensureObraAccessMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    getObraScheduleMock.mockRejectedValue(new Error('sensitive-db-stack-trace'))

    const page = await PrintPage({ params: { id: 'o1' } })
    render(page)

    expect(screen.getByText('No pudimos preparar la impresión')).toBeTruthy()
    expect(screen.queryByText(/sensitive-db-stack-trace/)).toBeNull()
  })

  it('resolves weekly print scale for >=60-day schedules', async () => {
    ensureObraAccessMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    getObraScheduleMock.mockResolvedValue({
      obra: {
        id: 'o1',
        projectId: 'p1',
        nombre: 'Obra Semanal',
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
          nombre: 'Tarea larga',
          duracionDias: 60,
          dependeDeId: null,
          orden: 1,
        },
      ],
      dependencies: [],
      holidays: new Set(),
    })

    const page = await PrintPage({ params: { id: 'o1' } })
    render(page)

    expect(screen.getByText(/Escala semanal/i)).toBeTruthy()
  })
})
