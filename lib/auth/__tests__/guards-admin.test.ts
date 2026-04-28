import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdmin } from '@/lib/auth/guards'

const { requireAuthenticatedUserMock, maybeSingleMock, eqMock, selectMock, fromMock } = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  eqMock: vi.fn(),
  selectMock: vi.fn(),
  fromMock: vi.fn(),
}))

vi.mock('@/lib/auth/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth/auth-context')
  return {
    ...actual,
    requireAuthenticatedUser: requireAuthenticatedUserMock,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: fromMock,
  }),
}))

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    eqMock.mockReturnValue({
      maybeSingle: maybeSingleMock,
    })

    selectMock.mockReturnValue({
      eq: eqMock,
    })

    fromMock.mockReturnValue({
      select: selectMock,
    })
  })

  it('returns auth context when profile is active and admin', async () => {
    requireAuthenticatedUserMock.mockResolvedValue({ userId: 'u-admin' })
    maybeSingleMock.mockResolvedValue({
      data: { global_role: 'admin', is_active: true },
      error: null,
    })

    const result = await requireAdmin()

    expect(result).toEqual({ userId: 'u-admin' })
    expect(fromMock).toHaveBeenCalledWith('profiles')
    expect(eqMock).toHaveBeenCalledWith('user_id', 'u-admin')
  })

  it('throws FORBIDDEN when user is not admin', async () => {
    requireAuthenticatedUserMock.mockResolvedValue({ userId: 'u-member' })
    maybeSingleMock.mockResolvedValue({
      data: { global_role: 'member', is_active: true },
      error: null,
    })

    await expect(requireAdmin()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'No tenés permisos de administrador.',
    })
  })

  it('throws FORBIDDEN when profile is inactive', async () => {
    requireAuthenticatedUserMock.mockResolvedValue({ userId: 'u-inactive' })
    maybeSingleMock.mockResolvedValue({
      data: { global_role: 'admin', is_active: false },
      error: null,
    })

    await expect(requireAdmin()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'No tenés permisos de administrador.',
    })
  })
})
