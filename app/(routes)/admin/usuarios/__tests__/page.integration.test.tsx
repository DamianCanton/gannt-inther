import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AdminUsuariosPage from '@/app/(routes)/admin/usuarios/page'
import { AuthContextError } from '@/lib/auth/auth-context'

const { requireAdminMock, listUsersForAdminMock, listAdminCatalogMock, redirectMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listUsersForAdminMock: vi.fn(),
  listAdminCatalogMock: vi.fn(),
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

vi.mock('@/app/actions/users', () => ({
  listUsersForAdmin: listUsersForAdminMock,
  listAdminCatalog: listAdminCatalogMock,
  createUser: vi.fn(),
  assignProject: vi.fn(),
  assignObra: vi.fn(),
  updateUserRole: vi.fn(),
  deactivateUser: vi.fn(),
}))

describe('/admin/usuarios page integration', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders users table for admins', async () => {
    requireAdminMock.mockResolvedValue({ userId: 'u-admin', projectId: 'p-1' })
    listUsersForAdminMock.mockResolvedValue([
      {
        userId: 'u-1',
        email: 'user@example.com',
        displayName: 'Usuario Uno',
        globalRole: 'member',
        isActive: true,
        projects: [{ projectId: 'p-1', role: 'member' }],
        obras: [{ obraId: 'o-1', obraNombre: 'Obra Norte', role: 'viewer' }],
      },
    ])
    listAdminCatalogMock.mockResolvedValue({
      projects: [{ projectId: 'p-1', nombre: 'Proyecto Norte', userCount: 1, obraCount: 1 }],
      obras: [{ obraId: 'o-1', nombre: 'Obra Norte', projectId: 'p-1' }],
    })

    const page = await AdminUsuariosPage()
    render(page)

    expect(screen.getByText('Administración de usuarios')).toBeTruthy()
    expect(screen.getByText('user@example.com')).toBeTruthy()
    expect(screen.getByText('Usuario Uno')).toBeTruthy()
    expect(screen.getByText('Catálogo de proyectos')).toBeTruthy()
    expect(screen.getByText(/Proyecto Norte/)).toBeTruthy()
    expect(screen.getByText(/ID: p-1/)).toBeTruthy()
    expect(screen.getByText('Catálogo de obras')).toBeTruthy()
    expect(screen.getByText('ID: o-1')).toBeTruthy()
  })

  it('redirects to login when unauthenticated', async () => {
    requireAdminMock.mockRejectedValue(
      new AuthContextError('UNAUTHENTICATED', 'Debés iniciar sesión para continuar.')
    )

    await expect(AdminUsuariosPage()).rejects.toThrow('NEXT_REDIRECT:/auth/login')
    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })

  it('renders forbidden state when user is not admin', async () => {
    requireAdminMock.mockRejectedValue(
      new AuthContextError('FORBIDDEN', 'No tenés permisos de administrador.')
    )

    const page = await AdminUsuariosPage()
    render(page)

    expect(screen.getByText('No tenés permisos de administrador.')).toBeTruthy()
  })
})
