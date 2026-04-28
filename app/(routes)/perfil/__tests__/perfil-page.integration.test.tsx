import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PerfilPage from '@/app/(routes)/perfil/page'

const { redirectMock, getUserMock, selectMock, eqMock, maybeSingleMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`)
  }),
  getUserMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: () => ({
      select: selectMock,
    }),
  }),
}))

vi.mock('@/components/perfil/perfil-page-client', () => ({
  PerfilPageClient: ({
    email,
    createdAt,
    lastSignInAt,
    displayName,
    isAdmin,
  }: {
    email: string
    createdAt: string
    lastSignInAt: string | null
    displayName: string
    isAdmin?: boolean
  }) => (
    <section>
      <h1>Perfil</h1>
      <p>{email}</p>
      <p>{displayName}</p>
      <p>{createdAt}</p>
      <p>{lastSignInAt ?? 'Sin acceso reciente'}</p>
      {isAdmin ? <p>Admin</p> : null}
    </section>
  ),
}))

describe('/perfil route integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    eqMock.mockReturnValue({
      maybeSingle: maybeSingleMock,
    })
    maybeSingleMock.mockResolvedValue({
      data: { display_name: 'Juan Perez' },
      error: null,
    })
    selectMock.mockReturnValue({
      eq: eqMock,
    })
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'u1',
          email: 'user@example.com',
          created_at: '2026-04-20T10:00:00.000Z',
          last_sign_in_at: '2026-04-27T11:20:00.000Z',
        },
      },
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders authenticated profile details', async () => {
    const page = await PerfilPage()
    render(page)

    expect(screen.getByText('Perfil')).toBeTruthy()
    expect(screen.getByText('user@example.com')).toBeTruthy()
    expect(screen.getByText('Juan Perez')).toBeTruthy()
    expect(eqMock).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('shows admin access button when profile is admin', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { display_name: 'Juan Perez', global_role: 'admin', is_active: true },
      error: null,
    })

    const page = await PerfilPage()
    render(page)

    expect(screen.getByText('Admin')).toBeTruthy()
  })

  it('redirects anonymous users to /auth/login', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    await expect(PerfilPage()).rejects.toThrow('NEXT_REDIRECT:/auth/login')
    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })
})
