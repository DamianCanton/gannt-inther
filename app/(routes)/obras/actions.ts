'use server'

import { redirect } from 'next/navigation'

import { AuthContextError, requireAuthContext } from '@/lib/auth/auth-context'
import { remapTemplateToBootstrap } from '@/lib/bootstrap-mapping'
import { RepoAccessError, GanttRepo } from '@/lib/repositories/gantt-repo'
import { TemplateRepo } from '@/lib/repositories/template-repo'
import { createServerClient } from '@/lib/supabase/server'
import { resolveDependencies } from '@/lib/gantt-dag'
import type { IsoDate, ObraBootstrapTarea, TipoObra, Uuid } from '@/types/gantt'

function readString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function redirectWithError(code: string): never {
  redirect(`/obras?error=${encodeURIComponent(code)}`)
}

/**
 * Bootstrap tareas from template for a new obra.
 *
 * Flow:
 * 1. Fetch published template for the tipo_obra
 * 2. Generate new UUIDs for each task
 * 3. Map template dependency IDs to new UUIDs
 * 4. Run date-engine to compute dates
 * 5. Return fully computed tarea payload for RPC insertion
 */
async function bootstrapTareasFromTemplate(params: {
  supabase: ReturnType<typeof createServerClient>
  projectId: Uuid
  tipoObra: TipoObra
  obraStartDate: IsoDate
}): Promise<ObraBootstrapTarea[]> {
  const { supabase, projectId, tipoObra, obraStartDate } = params

  const templateRepo = new TemplateRepo(supabase)
  const templateTasks = await templateRepo.getActiveTemplate({ projectId, tipoObra })

  if (templateTasks.length === 0) {
    throw new Error(`EMPTY_TEMPLATE:${tipoObra}`)
  }

  // Generate new UUIDs, remap template IDs → new IDs, preserve dependency graph
  const bootstrapTareas = remapTemplateToBootstrap(templateTasks)

  // Build TaskDependency[] from the resolved depende_de relationships
  const dependencies = bootstrapTareas
    .filter((t) => t.dependeDeId !== null)
    .map((t) => ({
      taskId: t.id,
      dependsOnTaskId: t.dependeDeId!,
      kind: 'FS' as const,
    }))

  // Fetch holidays for date calculation
  const { data: feriadosRows, error: feriadosError } = await supabase
    .from('feriados')
    .select('fecha')

  if (feriadosError) {
    throw new Error(feriadosError.message)
  }

  const holidays = new Set<string>((feriadosRows ?? []).map((r) => r.fecha))

  // Use the existing DAG resolver to compute dates
  const taskInputs = bootstrapTareas.map((t) => ({
    id: t.id,
    projectId,
    obraId: '' as Uuid, // placeholder — assigned by RPC
    nombre: t.nombre,
    duracionDias: t.duracionDias,
    dependeDeId: t.dependeDeId,
    orden: t.orden,
  }))

  const scheduled = resolveDependencies(obraStartDate, taskInputs, holidays, dependencies)

  // Return tasks with computed dates embedded (for future use in RPC if needed)
  // The RPC currently just stores the basic task data
  return scheduled.map((task) => ({
    id: task.id,
    nombre: task.nombre,
    duracionDias: task.duracionDias,
    dependeDeId: task.dependeDeId,
    orden: task.orden,
  }))
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
  const templateRepo = new TemplateRepo(supabase)

  try {
    const auth = await requireAuthContext()

    // Step 1-4: Bootstrap tasks from template
    const bootstrapTareas = await bootstrapTareasFromTemplate({
      supabase,
      projectId: auth.projectId,
      tipoObra: tipoObra as TipoObra,
      obraStartDate: fechaInicioGlobal as IsoDate,
    })

    // Step 5: Call atomic RPC
    await templateRepo.createObraFromTemplate({
      projectId: auth.projectId,
      nombre,
      cliente: clienteRaw || null,
      tipoObra: tipoObra as TipoObra,
      fechaInicioGlobal: fechaInicioGlobal as IsoDate,
      vigenciaTexto: vigenciaRaw || null,
      tareas: bootstrapTareas,
    })
  } catch (error) {
    if (error instanceof AuthContextError && error.code === 'UNAUTHENTICATED') {
      redirect('/auth/login')
    }

    if (error instanceof AuthContextError && error.code === 'NO_PROJECT_MEMBERSHIP') {
      redirectWithError('NO_PROJECT_MEMBERSHIP')
    }

    if (error instanceof Error && error.message.startsWith('EMPTY_TEMPLATE')) {
      redirectWithError('EMPTY_TEMPLATE')
    }

    console.error('[createObraAction] Error:', error)
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
