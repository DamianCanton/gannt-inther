import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PrintPage from '@/app/(routes)/obra/[id]/print/page'

const captured = vi.hoisted(() => ({
  printConfig: null as unknown,
}))

const { ensureObraAccessMock, getObraScheduleMock } = vi.hoisted(() => ({
  ensureObraAccessMock: vi.fn(),
  getObraScheduleMock: vi.fn(),
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

vi.mock('@/components/gantt/gantt-print-table', () => ({
  GanttPrintTable: (props: unknown) => {
    captured.printConfig = (props as { printConfig: unknown }).printConfig
    return <div data-testid="mock-print-table" />
  },
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => null),
  redirect: vi.fn(),
}))

describe('print page contract', () => {
  it('passes persisted viewMode from query config to print surface', async () => {
    ensureObraAccessMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    getObraScheduleMock.mockResolvedValue({
      obra: {
        id: 'o1',
        projectId: 'p1',
        nombre: 'Obra Test',
        cliente: null,
        tipoObra: 'Tipo A',
        fechaInicioGlobal: '2026-04-06',
        vigenciaTexto: null,
      },
      tasks: [],
      dependencies: [],
      holidays: new Set(),
    })

    const page = await PrintPage({
      params: { id: 'o1' },
      searchParams: {
        config: JSON.stringify({
          selectionMode: 'visible',
          includeOneDayTasks: true,
          expandAllBeforePrint: false,
          visibleTaskIds: ['T1'],
          manualTaskIds: [],
          viewMode: 'weekly',
        }),
      },
    })

    render(page)

    expect((captured.printConfig as { viewMode?: string } | null)?.viewMode).toBe('weekly')
  })
})
