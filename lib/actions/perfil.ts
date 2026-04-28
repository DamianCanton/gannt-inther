'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/supabase/server'

interface FieldErrors {
  displayName?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export interface UpdateProfileState {
  error?: string
  success?: string
  fieldErrors?: FieldErrors
}

export interface ChangePasswordState {
  error?: string
  success?: string
  fieldErrors?: FieldErrors
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function signout(): Promise<void> {
  const supabase = createServerClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const displayName = readString(formData, 'displayName')

  if (!displayName) {
    return {
      error: 'El nombre para mostrar es obligatorio.',
      success: undefined,
      fieldErrors: {
        displayName: 'Ingresá un nombre para mostrar.',
      },
    }
  }

  if (displayName.length > 80) {
    return {
      error: 'El nombre para mostrar no puede superar los 80 caracteres.',
      success: undefined,
      fieldErrors: {
        displayName: 'Máximo 80 caracteres.',
      },
    }
  }

  const supabase = createServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return {
      error: 'Tu sesión expiró. Iniciá sesión nuevamente.',
      success: undefined,
      fieldErrors: undefined,
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('user_id', userData.user.id)

  if (error) {
    return {
      error: error.message,
      success: undefined,
      fieldErrors: undefined,
    }
  }

  revalidatePath('/perfil')

  return {
    error: undefined,
    success: 'Perfil actualizado correctamente.',
    fieldErrors: undefined,
  }
}

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = readString(formData, 'currentPassword')
  const newPassword = readString(formData, 'newPassword')
  const confirmPassword = readString(formData, 'confirmPassword')

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      error: 'Completá todos los campos para cambiar la contraseña.',
      success: undefined,
      fieldErrors: {
        currentPassword: !currentPassword ? 'Ingresá tu contraseña actual.' : undefined,
        newPassword: !newPassword ? 'Ingresá una nueva contraseña.' : undefined,
        confirmPassword: !confirmPassword ? 'Confirmá la nueva contraseña.' : undefined,
      },
    }
  }

  if (newPassword.length < 6) {
    return {
      error: 'La nueva contraseña debe tener al menos 6 caracteres.',
      success: undefined,
      fieldErrors: {
        newPassword: 'Mínimo 6 caracteres.',
      },
    }
  }

  if (newPassword !== confirmPassword) {
    return {
      error: 'La confirmación no coincide con la nueva contraseña.',
      success: undefined,
      fieldErrors: {
        confirmPassword: 'Las contraseñas no coinciden.',
      },
    }
  }

  const supabase = createServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user?.email) {
    return {
      error: 'Tu sesión expiró. Iniciá sesión nuevamente.',
      success: undefined,
      fieldErrors: undefined,
    }
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  })

  if (reauthError) {
    return {
      error: 'La contraseña actual es incorrecta.',
      success: undefined,
      fieldErrors: {
        currentPassword: 'No coincide con tu contraseña actual.',
      },
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return {
      error: updateError.message,
      success: undefined,
      fieldErrors: undefined,
    }
  }

  revalidatePath('/perfil')

  return {
    error: undefined,
    success: 'Contraseña actualizada correctamente.',
    fieldErrors: undefined,
  }
}
