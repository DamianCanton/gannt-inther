import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ObrasPage from '@/app/(routes)/obras/page'
import { AuthContextError } from '@/lib/auth/auth-context'

const { requireAuthContextMock, obrasQueryMock, redirectMock } = vi.hoisted(() => ({
  requireAuthContextMock: vi.fn(),
  obrasQueryMock: vi.fn(),
  redirectMock: vi.fn(),
}))

vi.mock('@/app/(routes)/obras/actions', () => ({
  createObraAction: '/_actions/create-obra',
  deleteObraAction: '/_actions/delete-obra',
}))

vi.mock('@/lib/auth/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth/auth-context')
  return {
    ...actual,
    requireAuthContext: requireAuthContextMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: obrasQueryMock,
      }),
    }),
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

describe('/obras route integration', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders only obras from resolved membership project', async () => {
    requireAuthContextMock.mockResolvedValue({ userId: 'u1', projectId: 'p1' })
    obrasQueryMock.mockResolvedValue({
      data: [{ id: 'o1', nombre: 'Obra Norte', project_id: 'p1' }],
      error: null,
    })

    const page = await ObrasPage({})
    render(page)

    expect(screen.getByText('Obra Norte')).toBeTruthy()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated users to login', async () => {
    requireAuthContextMock.mockRejectedValue(
      new AuthContextError('UNAUTHENTICATED', 'login required')
    )

    await ObrasPage({})

    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })

  it('renders secure empty state when user has no membership', async () => {
    requireAuthContextMock.mockRejectedValue(
      new AuthContextError('NO_PROJECT_MEMBERSHIP', 'no membership')
    )

    const page = await ObrasPage({})
    render(page)

    expect(screen.getByText('No tenés membresía activa en ningún proyecto.')).toBeTruthy()
  })
})
