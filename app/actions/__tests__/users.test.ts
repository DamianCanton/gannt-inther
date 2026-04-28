import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  assignProject,
  assignObra,
  createUser,
  deactivateUser,
  listAdminCatalog,
  listUsersForAdmin,
  updateUserRole,
} from '@/app/actions/users'

const {
  requireAdminMock,
  createUserMock,
  upsertProjectMembershipMock,
  upsertObraMembershipMock,
  getObraProjectMock,
  getProjectMembershipMock,
  updateProfileMock,
  listUsersMock,
  selectProfilesReturnsMock,
  selectObraMembershipsReturnsMock,
  selectProjectMembershipsForListMock,
  selectProjectsForCatalogMock,
  selectProjectMembershipsForCatalogMock,
  inObrasReturnsMock,
  selectObrasForCatalogMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  createUserMock: vi.fn(),
  upsertProjectMembershipMock: vi.fn(),
  upsertObraMembershipMock: vi.fn(),
  getObraProjectMock: vi.fn(),
  getProjectMembershipMock: vi.fn(),
  updateProfileMock: vi.fn(),
  listUsersMock: vi.fn(),
  selectProfilesReturnsMock: vi.fn(),
  selectObraMembershipsReturnsMock: vi.fn(),
  selectProjectMembershipsForListMock: vi.fn(),
  selectProjectsForCatalogMock: vi.fn(),
  selectProjectMembershipsForCatalogMock: vi.fn(),
  inObrasReturnsMock: vi.fn(),
  selectObrasForCatalogMock: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: requireAdminMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        createUser: createUserMock,
        listUsers: listUsersMock,
      },
    },
    from: (table: string) => {
      if (table === 'project_memberships') {
        return {
          upsert: upsertProjectMembershipMock,
          select: (columns?: string) => {
            if (columns?.includes('user_id')) {
              return {
                returns: () => selectProjectMembershipsForListMock(),
              }
            }

            return {
              eq: () => ({
                eq: () => ({
                  maybeSingle: getProjectMembershipMock,
                }),
              }),
              returns: () => selectProjectMembershipsForCatalogMock(),
            }
          },
        }
      }

      if (table === 'projects') {
        return {
          select: () => ({
            returns: selectProjectsForCatalogMock,
          }),
        }
      }

      if (table === 'obra_memberships') {
        return {
          upsert: upsertObraMembershipMock,
          select: () => ({
            returns: selectObraMembershipsReturnsMock,
          }),
        }
      }

      if (table === 'obras') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: getObraProjectMock,
            }),
            in: () => ({
              returns: inObrasReturnsMock,
            }),
            returns: selectObrasForCatalogMock,
          }),
        }
      }

      if (table === 'profiles') {
        return {
          upsert: updateProfileMock,
          select: () => ({
            returns: selectProfilesReturnsMock,
          }),
          update: () => ({
            eq: updateProfileMock,
          }),
        }
      }

      return {
        upsert: vi.fn(),
      }
    },
  }),
}))

describe('admin users actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireAdminMock.mockResolvedValue({ userId: 'u-admin', projectId: 'p-admin' })
    createUserMock.mockResolvedValue({
      data: { user: { id: 'u-new' } },
      error: null,
    })

    upsertProjectMembershipMock.mockResolvedValue({ error: null })
    upsertObraMembershipMock.mockResolvedValue({ error: null })
    updateProfileMock.mockResolvedValue({ error: null })
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null })
    selectProfilesReturnsMock.mockResolvedValue({ data: [], error: null })
    selectProjectMembershipsForListMock.mockResolvedValue({ data: [], error: null })
    selectProjectMembershipsForCatalogMock.mockResolvedValue({ data: [], error: null })
    selectProjectsForCatalogMock.mockResolvedValue({ data: [], error: null })
    selectObraMembershipsReturnsMock.mockResolvedValue({ data: [], error: null })
    inObrasReturnsMock.mockResolvedValue({ data: [], error: null })
    selectObrasForCatalogMock.mockResolvedValue({ data: [], error: null })
    getObraProjectMock.mockResolvedValue({
      data: { project_id: 'p-1' },
      error: null,
    })
    getProjectMembershipMock.mockResolvedValue({
      data: null,
      error: null,
    })
  })

  it('rejects invalid email in createUser', async () => {
    const result = await createUser('', '123456', 'Juan', 'member', [], [])

    expect(result).toEqual({ success: false, error: 'VALIDATION_ERROR' })
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('creates user and skips obra membership when project access already exists', async () => {
    getProjectMembershipMock.mockResolvedValueOnce({
      data: { project_id: 'p-1' },
      error: null,
    })

    const result = await createUser(
      'nuevo@example.com',
      '123456',
      'Nuevo',
      'admin',
      [{ projectId: 'p-1', role: 'member' }],
      [{ obraId: 'o-1', role: 'editor' }]
    )

    expect(result).toEqual({ success: true })
    expect(createUserMock).toHaveBeenCalled()
    expect(upsertProjectMembershipMock).toHaveBeenCalledTimes(1)
    expect(upsertObraMembershipMock).not.toHaveBeenCalled()
  })

  it('assignObra is idempotent and avoids redundant grant by project membership', async () => {
    getProjectMembershipMock.mockResolvedValueOnce({
      data: { project_id: 'p-1' },
      error: null,
    })

    const result = await assignObra('u-1', 'o-1', 'viewer')

    expect(result).toEqual({ success: true })
    expect(upsertObraMembershipMock).not.toHaveBeenCalled()
  })

  it('assignProject validates required input before writing', async () => {
    const result = await assignProject('', 'p-1', 'member')

    expect(result).toEqual({ success: false, error: 'VALIDATION_ERROR' })
    expect(upsertProjectMembershipMock).not.toHaveBeenCalled()
  })

  it('assignObra writes created_by with current admin user id', async () => {
    const result = await assignObra('u-1', 'o-1', 'viewer')

    expect(result).toEqual({ success: true })
    expect(upsertObraMembershipMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u-1',
        obra_id: 'o-1',
        role: 'viewer',
        created_by: 'u-admin',
      }),
      { onConflict: 'user_id,obra_id' }
    )
  })

  it('updateUserRole updates profile global role', async () => {
    const result = await updateUserRole('u-1', 'admin')

    expect(result).toEqual({ success: true })
    expect(updateProfileMock).toHaveBeenCalledWith('user_id', 'u-1')
  })

  it('deactivateUser performs soft delete with is_active false', async () => {
    const result = await deactivateUser('u-1')

    expect(result).toEqual({ success: true })
    expect(updateProfileMock).toHaveBeenCalledWith('user_id', 'u-1')
  })

  it('listUsersForAdmin is guarded by requireAdmin', async () => {
    requireAdminMock.mockRejectedValueOnce(new Error('FORBIDDEN'))

    await expect(listUsersForAdmin()).rejects.toThrow('FORBIDDEN')
    expect(requireAdminMock).toHaveBeenCalledTimes(1)
    expect(listUsersMock).not.toHaveBeenCalled()
  })

  it('listUsersForAdmin merges users, profiles, project memberships and obra names', async () => {
    listUsersMock.mockResolvedValueOnce({
      data: {
        users: [
          {
            id: 'u-1',
            email: 'uno@example.com',
          },
        ],
      },
      error: null,
    })

    selectProfilesReturnsMock.mockResolvedValueOnce({
      data: [
        {
          user_id: 'u-1',
          display_name: 'Uno',
          global_role: 'admin',
          is_active: false,
        },
      ],
      error: null,
    })

    selectProjectMembershipsForListMock.mockResolvedValueOnce({
      data: [
        {
          user_id: 'u-1',
          project_id: 'p-1',
          role: 'member',
        },
      ],
      error: null,
    })

    selectObraMembershipsReturnsMock.mockResolvedValueOnce({
      data: [
        {
          user_id: 'u-1',
          obra_id: 'o-1',
          role: 'viewer',
        },
      ],
      error: null,
    })

    inObrasReturnsMock.mockResolvedValueOnce({
      data: [
        {
          id: 'o-1',
          nombre: 'Obra Norte',
        },
      ],
      error: null,
    })

    const result = await listUsersForAdmin()

    expect(result).toEqual([
      {
        userId: 'u-1',
        email: 'uno@example.com',
        displayName: 'Uno',
        globalRole: 'admin',
        isActive: false,
        projects: [
          {
            projectId: 'p-1',
            role: 'member',
          },
        ],
        obras: [
          {
            obraId: 'o-1',
            obraNombre: 'Obra Norte',
            role: 'viewer',
          },
        ],
      },
    ])
  })

  it('listAdminCatalog returns projects using projects table as source of truth', async () => {
    selectProjectsForCatalogMock.mockResolvedValueOnce({
      data: [{ id: 'p-1', nombre: 'Proyecto Norte' }],
      error: null,
    })
    selectProjectMembershipsForListMock.mockResolvedValueOnce({
      data: [
        { user_id: 'u-1', project_id: 'p-1' },
        { user_id: 'u-2', project_id: 'p-1' },
      ],
      error: null,
    })
    selectObrasForCatalogMock.mockResolvedValueOnce({
      data: [
        { id: 'o-1', nombre: 'Obra Norte', project_id: 'p-1' },
        { id: 'o-2', nombre: 'Obra Sur', project_id: 'p-1' },
      ],
      error: null,
    })

    const catalog = await listAdminCatalog()

    expect(catalog).toEqual({
      projects: [
        {
          projectId: 'p-1',
          nombre: 'Proyecto Norte',
          userCount: 2,
          obraCount: 2,
        },
      ],
      obras: [
        { obraId: 'o-1', nombre: 'Obra Norte', projectId: 'p-1' },
        { obraId: 'o-2', nombre: 'Obra Sur', projectId: 'p-1' },
      ],
    })
  })
})
