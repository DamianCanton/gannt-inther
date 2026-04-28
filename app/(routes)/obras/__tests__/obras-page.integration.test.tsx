import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ObrasPage from '@/app/(routes)/obras/page'
import { AuthContextError } from '@/lib/auth/auth-context'

const { requireAuthContextMock, listObrasMock, redirectMock } = vi.hoisted(() => ({
  requireAuthContextMock: vi.fn(),
  listObrasMock: vi.fn(),
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`)
  }),
}))

vi.mock('@/app/(routes)/obras/actions', () => ({
  createObraAction: vi.fn(),
  deleteObraAction: vi.fn(),
}))

vi.mock('@/lib/auth/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth/auth-context')
  return {
    ...actual,
    requireAuthContext: requireAuthContextMock,
  }
})

vi.mock('@/lib/repositories/gantt-repo', () => ({
  GanttRepo: class {
    listObras = listObrasMock
  },
  RepoAccessError: class extends Error {},
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({}),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

describe('/obras route integration', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders obras from GanttRepo.listObras', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    listObrasMock.mockResolvedValue([
      {
        id: 'o1',
        projectId: 'p1',
        nombre: 'Obra Norte',
        cliente: null,
        tipoObra: 'SPLIT',
        fechaInicioGlobal: '2026-04-01',
        vigenciaTexto: null,
        taskCount: 5,
      },
    ])

    const page = await ObrasPage()
    render(page)

    expect(screen.getByText('Obra Norte')).toBeTruthy()
    expect(listObrasMock).toHaveBeenCalledWith('p1')
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated users to login', async () => {
    requireAuthContextMock.mockRejectedValue(
      new AuthContextError('UNAUTHENTICATED', 'login required')
    )

    await expect(ObrasPage()).rejects.toThrow('NEXT_REDIRECT:/auth/login')

    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })

  it('renders secure empty state when user has no membership', async () => {
    requireAuthContextMock.mockRejectedValue(
      new AuthContextError('NO_PROJECT_MEMBERSHIP', 'no membership')
    )

    const page = await ObrasPage()
    render(page)

    expect(screen.getByText('No tenés membresía activa en ningún proyecto')).toBeTruthy()
  })
})
