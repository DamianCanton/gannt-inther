import { createServerClient } from '@/lib/supabase/server'

export type AuthContextErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_PROJECT_MEMBERSHIP'
  | 'FORBIDDEN'
  | 'FORBIDDEN_OR_NOT_FOUND'

export class AuthContextError extends Error {
  public readonly code: AuthContextErrorCode

  public constructor(code: AuthContextErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AuthContextError'
  }
}

export interface AuthContext {
  userId: string
  projectId: string
}

export interface AuthenticatedUserContext {
  userId: string
}

type MembershipRow = {
  project_id: string
}

export async function requireAuthContext(): Promise<AuthContext> {
  const userContext = await requireAuthenticatedUser()
  const supabase = createServerClient()

  const { data: memberships, error: membershipError } = await supabase
    .from('project_memberships')
    .select('project_id')
    .eq('user_id', userContext.userId)
    .order('created_at', { ascending: true })
    .order('project_id', { ascending: true })
    .returns<MembershipRow[]>()

  if (membershipError) {
    throw new AuthContextError(
      'NO_PROJECT_MEMBERSHIP',
      'No pudimos resolver tus membresías de proyecto.'
    )
  }

  const projectId = memberships?.[0]?.project_id
  if (!projectId) {
    throw new AuthContextError(
      'NO_PROJECT_MEMBERSHIP',
      'Tu usuario no tiene membresía activa en ningún proyecto.'
    )
  }

  return {
    userId: userContext.userId,
    projectId,
  }
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const supabase = createServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new AuthContextError('UNAUTHENTICATED', 'Debés iniciar sesión para continuar.')
  }

  return { userId: userData.user.id }
}
