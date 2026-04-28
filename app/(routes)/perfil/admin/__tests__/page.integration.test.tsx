import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PerfilAdminPage from '@/app/(routes)/perfil/admin/page'
import { AuthContextError } from '@/lib/auth/auth-context'

const { requireAdminMock, redirectMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`)
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: requireAdminMock,
}))

describe('/perfil/admin route integration', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders dashboard cards for admins', async () => {
    requireAdminMock.mockResolvedValue({ userId: 'u-admin', projectId: 'p-1' })

    const page = await PerfilAdminPage()
    render(page)

    expect(screen.getByText('Centro de control')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Usuarios/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Tipos de obra/ })).toBeTruthy()
  })

  it('redirects anonymous users to login', async () => {
    requireAdminMock.mockRejectedValue(new AuthContextError('UNAUTHENTICATED', 'Debés iniciar sesión para continuar.'))

    await expect(PerfilAdminPage()).rejects.toThrow('NEXT_REDIRECT:/auth/login')
    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })
})
