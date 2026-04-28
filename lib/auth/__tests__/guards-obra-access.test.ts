import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureObraAccess } from '@/lib/auth/guards'

const {
  requireAuthenticatedUserMock,
  maybeSingleMock,
  eqObraIdMock,
  selectMock,
  fromMock,
} = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  eqObraIdMock: vi.fn(),
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

describe('ensureObraAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireAuthenticatedUserMock.mockResolvedValue({ userId: 'u-obra' })

    eqObraIdMock.mockReturnValue({
      maybeSingle: maybeSingleMock,
    })

    selectMock.mockReturnValue({
      eq: eqObraIdMock,
    })

    fromMock.mockReturnValue({
      select: selectMock,
    })
  })

  it('allows user with only obra membership (no project membership required)', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { project_id: 'p-from-obra' },
      error: null,
    })

    const context = await ensureObraAccess('o-1')

    expect(context).toEqual({ userId: 'u-obra', projectId: 'p-from-obra' })
    expect(fromMock).toHaveBeenCalledWith('obras')
  })

  it('allows user with only project membership when obra is visible by RLS', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { project_id: 'p-from-project' },
      error: null,
    })

    const context = await ensureObraAccess('o-2')

    expect(context).toEqual({ userId: 'u-obra', projectId: 'p-from-project' })
  })

  it('allows user with both memberships', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { project_id: 'p-both' },
      error: null,
    })

    const context = await ensureObraAccess('o-3')

    expect(context).toEqual({ userId: 'u-obra', projectId: 'p-both' })
  })

  it('blocks inactive users when RLS hides the obra row', async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    })

    await expect(ensureObraAccess('o-4')).rejects.toMatchObject({
      code: 'FORBIDDEN_OR_NOT_FOUND',
    })
  })
})
