import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  changePassword,
  signout,
  updateProfile,
  type ChangePasswordState,
  type UpdateProfileState,
} from '@/lib/actions/perfil'

const {
  redirectMock,
  revalidatePathMock,
  getUserMock,
  signOutMock,
  signInWithPasswordMock,
  updateUserMock,
  profilesUpdateMock,
  profilesEqMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  updateUserMock: vi.fn(),
  profilesUpdateMock: vi.fn(),
  profilesEqMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
      signInWithPassword: signInWithPasswordMock,
      updateUser: updateUserMock,
    },
    from: () => ({
      update: profilesUpdateMock,
    }),
  }),
}))

describe('perfil actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    profilesEqMock.mockResolvedValue({ error: null })
    profilesUpdateMock.mockReturnValue({
      eq: profilesEqMock,
    })

    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
      error: null,
    })
    signOutMock.mockResolvedValue({ error: null })
    signInWithPasswordMock.mockResolvedValue({ error: null })
    updateUserMock.mockResolvedValue({ error: null })
  })

  it('signout invalidates session and redirects to login', async () => {
    await signout()

    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })

  it('updateProfile rejects empty display name', async () => {
    const formData = new FormData()
    formData.set('displayName', '   ')

    const result = await updateProfile({} as UpdateProfileState, formData)

    expect(result).toEqual({
      error: 'El nombre para mostrar es obligatorio.',
      success: undefined,
      fieldErrors: {
        displayName: 'Ingresá un nombre para mostrar.',
      },
    })
    expect(profilesUpdateMock).not.toHaveBeenCalled()
  })

  it('updateProfile saves valid display name in current user profile', async () => {
    const formData = new FormData()
    formData.set('displayName', 'Juan Perez')

    const result = await updateProfile({} as UpdateProfileState, formData)

    expect(profilesUpdateMock).toHaveBeenCalledWith({ display_name: 'Juan Perez' })
    expect(profilesEqMock).toHaveBeenCalledWith('user_id', 'u1')
    expect(result).toEqual({
      error: undefined,
      success: 'Perfil actualizado correctamente.',
      fieldErrors: undefined,
    })
  })

  it('changePassword blocks update when current password is wrong', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    })

    const formData = new FormData()
    formData.set('currentPassword', 'bad-pass')
    formData.set('newPassword', 'new-secret-123')
    formData.set('confirmPassword', 'new-secret-123')

    const result = await changePassword({} as ChangePasswordState, formData)

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'bad-pass',
    })
    expect(updateUserMock).not.toHaveBeenCalled()
    expect(result.error).toContain('La contraseña actual es incorrecta')
  })

  it('changePassword updates password when current password is valid', async () => {
    const formData = new FormData()
    formData.set('currentPassword', 'secret123')
    formData.set('newPassword', 'new-secret-123')
    formData.set('confirmPassword', 'new-secret-123')

    const result = await changePassword({} as ChangePasswordState, formData)

    expect(updateUserMock).toHaveBeenCalledWith({
      password: 'new-secret-123',
    })
    expect(result).toEqual({
      error: undefined,
      success: 'Contraseña actualizada correctamente.',
      fieldErrors: undefined,
    })
  })
})
