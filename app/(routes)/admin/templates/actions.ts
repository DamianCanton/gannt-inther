'use server'

import { redirect } from 'next/navigation'

import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { TemplateRepo } from '@/lib/repositories/template-repo'
import { createServerClient } from '@/lib/supabase/server'
import { validateForPublish } from '@/lib/template-validation'
import type { TipoObra } from '@/types/gantt'

function redirectWithError(code: string): never {
  redirect(`/admin/templates?error=${encodeURIComponent(code)}`)
}

/**
 * Save (replace) the active template tasks for a given tipo_obra.
 * Single-state: no drafts, no versions.  Replaces everything atomically.
 */
export async function saveTemplateAction(formData: FormData): Promise<void> {
  const tipoObra = formData.get('tipoObra') as string | null
  const tasksJson = formData.get('tasks') as string | null

  if (!tipoObra || !tasksJson) {
    redirectWithError('VALIDATION_ERROR')
  }

  if (tipoObra !== 'Tipo A' && tipoObra !== 'Tipo B' && tipoObra !== 'Tipo C') {
    redirectWithError('VALIDATION_ERROR')
  }

  type RawTask = {
    id?: string
    nombre: string
    duracionDias: number
    dependeDeTemplateId: string | null
    orden: number
  }

  let tasks: RawTask[]
  try {
    tasks = JSON.parse(tasksJson)
  } catch {
    redirectWithError('VALIDATION_ERROR')
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    redirectWithError('VALIDATION_ERROR')
  }

  const supabase = createServerClient()
  const repo = new TemplateRepo(supabase)

  try {
    const auth = await requireAuthContext()

    const validatedTasks = tasks.map((t, i) => ({
      id: t.id ?? crypto.randomUUID(),
      nombre: t.nombre,
      duracionDias: Number(t.duracionDias),
      dependeDeTemplateId: t.dependeDeTemplateId || null,
      orden: Number(t.orden ?? i),
    }))

    validateForPublish(validatedTasks)

    await repo.saveActiveTemplate({
      projectId: auth.projectId,
      tipoObra: tipoObra as TipoObra,
      tasks: validatedTasks,
    })
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      redirectWithError('NO_PROJECT_MEMBERSHIP')
    }

    redirectWithError('SAVE_FAILED')
  }

  redirect('/admin/templates')
}

/**
 * Load the active template tasks for a given tipo_obra.
 * Falls back to sentinel defaults if the user project has none.
 */
export async function loadTemplateTasksAction(tipoObra: TipoObra): Promise<{
  tasks: { id: string; nombre: string; duracionDias: number; dependeDeTemplateId: string | null; orden: number }[]
}> {
  const supabase = createServerClient()
  const repo = new TemplateRepo(supabase)

  try {
    const auth = await requireAuthContext()
    const templateTasks = await repo.getActiveTemplate({
      projectId: auth.projectId,
      tipoObra,
    })

    return {
      tasks: templateTasks.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        duracionDias: t.duracionDias,
        dependeDeTemplateId: t.dependeDeTemplateId,
        orden: t.orden,
      })),
    }
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }
    return { tasks: [] }
  }
}
