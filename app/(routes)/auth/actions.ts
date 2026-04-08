'use server'

import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/supabase/server'

export type AuthActionState = {
  error?: string
}

function readString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function login(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readString(formData.get('email'))
  const password = readString(formData.get('password'))

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/obras')
}

export async function signup(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readString(formData.get('email'))
  const password = readString(formData.get('password'))

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/obras')
}

export async function signout(): Promise<void> {
  const supabase = createServerClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
