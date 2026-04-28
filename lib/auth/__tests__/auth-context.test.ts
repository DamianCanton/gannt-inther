import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuthContext, requireAuthenticatedUser } from '@/lib/auth/auth-context'

const { getUserMock, membershipBuilder } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  membershipBuilder: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: () => ({
      select: () => membershipBuilder(),
    }),
  }),
}))

describe('requireAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the single available membership project', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    membershipBuilder.mockReturnValue({
      eq: () => ({
        order: () => ({
          order: () => ({
            returns: async () => ({ data: [{ project_id: 'p1' }], error: null }),
          }),
        }),
      }),
    })

    const context = await requireAuthContext()

    expect(context).toEqual({ userId: 'u1', projectId: 'p1' })
  })

  it('uses deterministic first membership when multiple exist', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    membershipBuilder.mockReturnValue({
      eq: () => ({
        order: () => ({
          order: () => ({
            returns: async () => ({
              data: [{ project_id: 'p-alpha' }, { project_id: 'p-zeta' }],
              error: null,
            }),
          }),
        }),
      }),
    })

    const context = await requireAuthContext()

    expect(context.projectId).toBe('p-alpha')
  })

  it('throws NO_PROJECT_MEMBERSHIP when user has none', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    membershipBuilder.mockReturnValue({
      eq: () => ({
        order: () => ({
          order: () => ({
            returns: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    })

    await expect(requireAuthContext()).rejects.toMatchObject({
      code: 'NO_PROJECT_MEMBERSHIP',
    })
  })

  it('throws UNAUTHENTICATED when no active user session exists', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAuthContext()).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })
})

describe('requireAuthenticatedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only user identity when session exists', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u-auth' } }, error: null })

    const context = await requireAuthenticatedUser()

    expect(context).toEqual({ userId: 'u-auth' })
  })

  it('throws UNAUTHENTICATED when user session does not exist', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAuthenticatedUser()).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })
})
