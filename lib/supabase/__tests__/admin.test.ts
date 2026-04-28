import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

import { createServiceRoleClient } from '@/lib/supabase/admin'

describe('createServiceRoleClient', () => {
  const originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY
  })

  it('throws when service role env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    expect(() => createServiceRoleClient()).toThrowError('SUPABASE_SERVICE_ROLE_NOT_CONFIGURED')
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('creates a server-only client with non-persistent auth settings', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

    const fakeClient = { ok: true }
    createClientMock.mockReturnValue(fakeClient)

    const result = createServiceRoleClient()

    expect(result).toBe(fakeClient)
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'service-role-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  })
})
