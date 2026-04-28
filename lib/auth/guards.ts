import { createServerClient } from '@/lib/supabase/server'
import type { Uuid } from '@/types/gantt'

import {
  AuthContextError,
  type AuthContext,
  type AuthenticatedUserContext,
  requireAuthenticatedUser,
} from './auth-context'

export async function requireUser(): Promise<AuthenticatedUserContext> {
  return requireAuthenticatedUser()
}

type AdminProfileRow = {
  global_role: 'member' | 'admin' | null
  is_active: boolean | null
}

export async function requireAdmin(): Promise<AuthenticatedUserContext> {
  const context = await requireAuthenticatedUser()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('global_role, is_active')
    .eq('user_id', context.userId)
    .maybeSingle<AdminProfileRow>()

  if (error || !data || data.global_role !== 'admin' || data.is_active !== true) {
    throw new AuthContextError('FORBIDDEN', 'No tenés permisos de administrador.')
  }

  return context
}

export async function ensureObraAccess(obraId: Uuid): Promise<AuthContext> {
  const context = await requireAuthenticatedUser()
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('obras')
    .select('project_id')
    .eq('id', obraId)
    .maybeSingle<{ project_id: string }>()

  if (error || !data?.project_id) {
    throw new AuthContextError(
      'FORBIDDEN_OR_NOT_FOUND',
      'No existe la obra solicitada o no tenés acceso.'
    )
  }

  return {
    userId: context.userId,
    projectId: data.project_id,
  }
}
