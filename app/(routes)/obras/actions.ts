'use server'

import { redirect } from 'next/navigation'

import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { RepoAccessError, GanttRepo } from '@/lib/repositories/gantt-repo'
import { createServerClient } from '@/lib/supabase/server'
import type { IsoDate, Uuid } from '@/types/gantt'

function readString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function redirectWithError(code: string): never {
  redirect(`/obras?error=${encodeURIComponent(code)}`)
}

export async function createObraAction(formData: FormData): Promise<void> {
  const nombre = readString(formData.get('nombre'))
  const clienteRaw = readString(formData.get('cliente'))
  const tipoObra = readString(formData.get('tipoObra'))
  const fechaInicioGlobal = readString(formData.get('fechaInicioGlobal'))
  const vigenciaRaw = readString(formData.get('vigenciaTexto'))

  if (!nombre || !tipoObra || !fechaInicioGlobal) {
    redirectWithError('VALIDATION_ERROR')
  }

  if (tipoObra !== 'Tipo A' && tipoObra !== 'Tipo B' && tipoObra !== 'Tipo C') {
    redirectWithError('VALIDATION_ERROR')
  }

  const supabase = createServerClient()
  const repo = new GanttRepo(supabase)

  try {
    const auth = await requireAuthContext()
    await repo.createObra({
      projectId: auth.projectId,
      input: {
        nombre,
        cliente: clienteRaw || null,
        tipoObra,
        fechaInicioGlobal: fechaInicioGlobal as IsoDate,
        vigenciaTexto: vigenciaRaw || null,
      },
    })
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      redirectWithError('NO_PROJECT_MEMBERSHIP')
    }

    redirectWithError('ATOMIC_WRITE_FAILED')
  }

  redirect('/obras')
}

export async function deleteObraAction(formData: FormData): Promise<void> {
  const obraId = readString(formData.get('obraId')) as Uuid
  if (!obraId) {
    redirectWithError('VALIDATION_ERROR')
  }

  const supabase = createServerClient()
  const repo = new GanttRepo(supabase)

  try {
    const auth = await requireAuthContext()
    await repo.deleteObra({
      projectId: auth.projectId,
      obraId,
    })
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      redirectWithError('NO_PROJECT_MEMBERSHIP')
    }

    if (error instanceof RepoAccessError) {
      redirectWithError('FORBIDDEN_OR_NOT_FOUND')
    }

    redirectWithError('ATOMIC_WRITE_FAILED')
  }

  redirect('/obras')
}
