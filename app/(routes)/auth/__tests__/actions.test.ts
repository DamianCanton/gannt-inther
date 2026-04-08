import { describe, expect, it, vi } from 'vitest'

import { login, signup } from '@/app/(routes)/auth/actions'

const { signInMock, signUpMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      signInWithPassword: signInMock,
      signUp: signUpMock,
      signOut: vi.fn(),
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('auth actions', () => {
  it('returns serializable error when login credentials are invalid', async () => {
    signInMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'wrong-pass')

    const result = await login({}, formData)

    expect(result).toEqual({ error: 'Invalid login credentials' })
  })

  it('returns serializable error when signup fails', async () => {
    signUpMock.mockResolvedValue({ error: { message: 'User already registered' } })

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'secret123')

    const result = await signup({}, formData)

    expect(result).toEqual({ error: 'User already registered' })
  })
})
