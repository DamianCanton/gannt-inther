import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { redirectMock, sessionState, signInMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  sessionState: {
    userId: null as string | null,
  },
  signInMock: vi.fn(async ({ email, password }: { email: string; password: string }) => {
    if (email === 'user@example.com' && password === 'secret123') {
      sessionState.userId = 'u1'
      return { error: null }
    }

    return { error: { message: 'Invalid login credentials' } }
  }),
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

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      signInWithPassword: signInMock,
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(async () => ({
        data: {
          user: sessionState.userId ? { id: sessionState.userId } : null,
        },
        error: null,
      })),
    },
    from: (table: string) => {
      if (table === 'project_memberships') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({
                  returns: async () => ({
                    data: sessionState.userId ? [{ project_id: 'p1' }] : [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'obras') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                data: [
                  {
                    id: 'o1',
                    nombre: 'Obra Norte',
                    project_id: 'p1',
                    tipo_obra: 'Tipo A',
                    fecha_inicio_global: '2026-04-01',
                    vigencia_texto: null,
                    tareas: [{ count: 3 }],
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }),
}))

import { login } from '@/app/(routes)/auth/actions'
import ObrasPage from '@/app/(routes)/obras/page'

describe('login -> protected route integration', () => {
  beforeEach(() => {
    sessionState.userId = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('successful login establishes session and grants /obras access', async () => {
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'secret123')

    await login({}, formData)

    expect(redirectMock).toHaveBeenCalledWith('/obras')

    const page = await ObrasPage()
    render(page)

    expect(screen.getByText('Obra Norte')).toBeTruthy()
    expect(redirectMock).not.toHaveBeenCalledWith('/auth/login')
  })
})
