import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getUserMock,
  cookiesSetMock,
  redirectMock,
  nextMock,
  cookiesGetAllMock,
  createServerClientMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  cookiesSetMock: vi.fn(),
  redirectMock: vi.fn((url: URL) => ({ kind: 'redirect', url: url.toString() })),
  nextMock: vi.fn((init?: { request?: unknown }) => ({ kind: 'next', init, cookies: { set: cookiesSetMock } })),
  cookiesGetAllMock: vi.fn(() => []),
  createServerClientMock: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: nextMock,
    redirect: redirectMock,
  },
}))

import { updateSession } from '@/lib/supabase/middleware'

function createRequest(url = 'http://localhost:3000/obras') {
  return {
    url,
    cookies: {
      getAll: cookiesGetAllMock,
      set: vi.fn(),
    },
  }
}

describe('updateSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    createServerClientMock.mockImplementation((_url: string, _anonKey: string, opts: { cookies: { setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } }) => {
      opts.cookies.setAll([{ name: 'sb-refresh', value: 'new-token', options: { path: '/' } }])

      return {
        auth: {
          getUser: getUserMock,
        },
      }
    })
  })

  it('keeps navigation open when refresh succeeds', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const response = await updateSession(createRequest() as never)

    expect(nextMock).toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
    expect(response).toMatchObject({ kind: 'next' })
  })

  it('fails closed and redirects to login when refresh cannot be completed', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'JWT expired' } })

    const response = await updateSession(createRequest('http://localhost:3000/obra/o1') as never)

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).toHaveBeenCalledWith(expect.any(URL))
    expect(response).toMatchObject({ kind: 'redirect', url: 'http://localhost:3000/auth/login' })
  })
})
