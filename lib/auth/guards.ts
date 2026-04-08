import { GanttRepo } from '@/lib/repositories/gantt-repo'
import { RepoAccessError } from '@/lib/repositories/gantt-repo'
import { createServerClient } from '@/lib/supabase/server'
import type { Uuid } from '@/types/gantt'

import { AuthContextError, type AuthContext, requireAuthContext } from './auth-context'

export async function requireUser(): Promise<AuthContext> {
  return requireAuthContext()
}

export async function ensureObraAccess(obraId: Uuid): Promise<AuthContext> {
  const context = await requireAuthContext()
  const repo = new GanttRepo(createServerClient())

  try {
    await repo.getObraSchedule({ projectId: context.projectId, obraId })
    return context
  } catch (error) {
    if (error instanceof RepoAccessError) {
      throw new AuthContextError(
        'FORBIDDEN_OR_NOT_FOUND',
        'No existe la obra solicitada o no tenés acceso.'
      )
    }

    throw new AuthContextError(
      'FORBIDDEN_OR_NOT_FOUND',
      'No existe la obra solicitada o no tenés acceso.'
    )
  }
}
