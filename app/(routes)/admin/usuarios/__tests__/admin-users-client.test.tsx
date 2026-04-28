import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminUsersClient } from '@/app/(routes)/admin/usuarios/admin-users-client'

describe('AdminUsersClient', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows empty state when there are no users', () => {
    render(
      <AdminUsersClient
        users={[]}
        actions={{
          createUser: vi.fn().mockResolvedValue({ success: true }),
          assignProject: vi.fn().mockResolvedValue({ success: true }),
          assignObra: vi.fn().mockResolvedValue({ success: true }),
          updateUserRole: vi.fn().mockResolvedValue({ success: true }),
          deactivateUser: vi.fn().mockResolvedValue({ success: true }),
        }}
      />
    )

    expect(screen.getByText('Todavía no hay usuarios para mostrar.')).toBeTruthy()
  })

  it('validates create dialog before calling action', async () => {
    const createUserMock = vi.fn().mockResolvedValue({ success: true })

    render(
      <AdminUsersClient
        users={[]}
        actions={{
          createUser: createUserMock,
          assignProject: vi.fn().mockResolvedValue({ success: true }),
          assignObra: vi.fn().mockResolvedValue({ success: true }),
          updateUserRole: vi.fn().mockResolvedValue({ success: true }),
          deactivateUser: vi.fn().mockResolvedValue({ success: true }),
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))

    expect(createUserMock).not.toHaveBeenCalled()
    expect(screen.getByText('Completá email y contraseña válidos.')).toBeTruthy()
  })

  it('shows quick buttons for member and admin creation', () => {
    render(
      <AdminUsersClient
        users={[]}
        actions={{
          createUser: vi.fn().mockResolvedValue({ success: true }),
          assignProject: vi.fn().mockResolvedValue({ success: true }),
          assignObra: vi.fn().mockResolvedValue({ success: true }),
          updateUserRole: vi.fn().mockResolvedValue({ success: true }),
          deactivateUser: vi.fn().mockResolvedValue({ success: true }),
        }}
      />
    )

    expect(screen.getByRole('button', { name: 'Crear miembro' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crear admin' })).toBeTruthy()
  })

  it('opens create dialog with preset role from quick buttons', () => {
    render(
      <AdminUsersClient
        users={[]}
        actions={{
          createUser: vi.fn().mockResolvedValue({ success: true }),
          assignProject: vi.fn().mockResolvedValue({ success: true }),
          assignObra: vi.fn().mockResolvedValue({ success: true }),
          updateUserRole: vi.fn().mockResolvedValue({ success: true }),
          deactivateUser: vi.fn().mockResolvedValue({ success: true }),
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Crear admin' }))

    expect(screen.getByRole('heading', { name: 'Crear usuario' })).toBeTruthy()
    expect((screen.getByLabelText('Rol global') as HTMLSelectElement).value).toBe('admin')
  })

  it('confirms deactivation before sending soft-delete action', async () => {
    const deactivateUserMock = vi.fn().mockResolvedValue({ success: true })

    render(
      <AdminUsersClient
        users={[
          {
            userId: 'u-1',
            email: 'uno@example.com',
            displayName: 'Uno',
            globalRole: 'member',
            isActive: true,
            projects: [],
            obras: [],
          },
        ]}
        actions={{
          createUser: vi.fn().mockResolvedValue({ success: true }),
          assignProject: vi.fn().mockResolvedValue({ success: true }),
          assignObra: vi.fn().mockResolvedValue({ success: true }),
          updateUserRole: vi.fn().mockResolvedValue({ success: true }),
          deactivateUser: deactivateUserMock,
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación' }))

    await waitFor(() => {
      expect(deactivateUserMock).toHaveBeenCalledWith('u-1')
    })
  })

  it('assigns project membership from access dialog', async () => {
    const assignProjectMock = vi.fn().mockResolvedValue({ success: true })

    render(
      <AdminUsersClient
        users={[
          {
            userId: 'u-1',
            email: 'uno@example.com',
            displayName: 'Uno',
            globalRole: 'member',
            isActive: true,
            projects: [],
            obras: [],
          },
        ]}
        catalog={{
          projects: [{ projectId: 'p-100', nombre: 'Proyecto Costanera', userCount: 0, obraCount: 1 }],
          obras: [{ obraId: 'o-777', nombre: 'Obra Central', projectId: 'p-100' }],
        }}
        actions={{
          createUser: vi.fn().mockResolvedValue({ success: true }),
          assignProject: assignProjectMock,
          assignObra: vi.fn().mockResolvedValue({ success: true }),
          updateUserRole: vi.fn().mockResolvedValue({ success: true }),
          deactivateUser: vi.fn().mockResolvedValue({ success: true }),
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar acceso' }))
    expect(screen.getByText('Proyectos disponibles')).toBeTruthy()
    expect(screen.getByText('Obras disponibles')).toBeTruthy()
    expect(screen.getAllByText('Proyecto Costanera').length).toBeGreaterThan(0)
    expect(screen.getByText('Proyecto Costanera · p-100')).toBeTruthy()
    expect(screen.getByText('Obra Central · o-777')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Project ID'), { target: { value: 'p-100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar proyecto' }))

    await waitFor(() => {
      expect(assignProjectMock).toHaveBeenCalledWith('u-1', 'p-100', 'member')
    })
    expect(screen.getByText('Proyecto asignado correctamente. Actualizá la vista para ver cambios.')).toBeTruthy()
  })

  it('shows backend error when obra assignment fails', async () => {
    const assignObraMock = vi.fn().mockResolvedValue({ success: false, error: 'FORBIDDEN' })

    render(
      <AdminUsersClient
        users={[
          {
            userId: 'u-1',
            email: 'uno@example.com',
            displayName: 'Uno',
            globalRole: 'member',
            isActive: true,
            projects: [],
            obras: [],
          },
        ]}
        catalog={{
          projects: [{ projectId: 'p-100', nombre: 'Proyecto Costanera', userCount: 0, obraCount: 1 }],
          obras: [{ obraId: 'o-777', nombre: 'Obra Central', projectId: 'p-100' }],
        }}
        actions={{
          createUser: vi.fn().mockResolvedValue({ success: true }),
          assignProject: vi.fn().mockResolvedValue({ success: true }),
          assignObra: assignObraMock,
          updateUserRole: vi.fn().mockResolvedValue({ success: true }),
          deactivateUser: vi.fn().mockResolvedValue({ success: true }),
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar acceso' }))
    fireEvent.change(screen.getByLabelText('Obra ID'), { target: { value: 'o-777' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar obra' }))

    await waitFor(() => {
      expect(assignObraMock).toHaveBeenCalledWith('u-1', 'o-777', 'viewer')
    })
    expect(screen.getByText('FORBIDDEN')).toBeTruthy()
  })
})
