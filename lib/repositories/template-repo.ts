import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  IsoDate,
  ObraBootstrapTarea,
  TemplateTarea,
  TipoObra,
  Uuid,
} from '@/types/gantt'

/**
 * Single-state constants: we keep version/status columns in the DB for
 * backward compatibility but always use these fixed values.  Every
 * `(project_id, tipo_obra)` has exactly one active set of tasks.
 */
const ACTIVE_VERSION = 1
const ACTIVE_STATUS = 'published'

type DbTemplateTareaRow = {
  id: string
  project_id: string
  tipo_obra: TipoObra
  version: number
  status: string
  nombre: string
  duracion_dias: number
  depende_de_template_id: string | null
  orden: number
}

type CreateObraFromTemplateInput = {
  projectId: Uuid
  nombre: string
  cliente: string | null
  tipoObra: TipoObra
  fechaInicioGlobal: IsoDate
  vigenciaTexto: string | null
  tareas: ObraBootstrapTarea[]
}

export class TemplateRepo {
  public constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Sentinel project_id used for global default templates seeded in migrations.
   */
  private static readonly SENTINEL_PROJECT_ID = '00000000-0000-0000-0000-000000000000'

  // ─── Single-state read ───────────────────────────────────────────────────

  /**
   * Fetch the active template tasks for a given tipo_obra.
   * Tries the user project first, then falls back to sentinel defaults.
   * No version/status filtering — every (project, tipo) has one active set.
   */
  public async getActiveTemplate(params: {
    projectId: Uuid
    tipoObra: TipoObra
  }): Promise<TemplateTarea[]> {
    const { projectId, tipoObra } = params

    // Try project-specific template first, then sentinel defaults
    const projectIds = [projectId]
    if (projectId !== TemplateRepo.SENTINEL_PROJECT_ID) {
      projectIds.push(TemplateRepo.SENTINEL_PROJECT_ID as Uuid)
    }

    for (const pid of projectIds) {
      const tasks = await this.fetchTemplateForProject(pid, tipoObra)
      if (tasks.length > 0) {
        return tasks
      }
    }

    return []
  }

  /**
   * Fetch template tasks for a specific project + tipo (no version/status filter).
   */
  private async fetchTemplateForProject(
    projectId: Uuid,
    tipoObra: TipoObra
  ): Promise<TemplateTarea[]> {
    const { data, error } = await this.supabase
      .from('template_tareas')
      .select('id, project_id, tipo_obra, version, status, nombre, duracion_dias, depende_de_template_id, orden')
      .eq('project_id', projectId)
      .eq('tipo_obra', tipoObra)
      .order('orden', { ascending: true })
      .returns<DbTemplateTareaRow[]>()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map(this.mapRow)
  }

  // ─── Single-state write ──────────────────────────────────────────────────

  /**
   * Replace all template tasks for (project, tipo_obra) atomically.
   * Deletes existing rows and inserts the new set with fixed version/status.
   */
  public async saveActiveTemplate(params: {
    projectId: Uuid
    tipoObra: TipoObra
    tasks: {
      id?: Uuid
      nombre: string
      duracionDias: number
      dependeDeTemplateId: Uuid | null
      orden: number
    }[]
  }): Promise<void> {
    const { projectId, tipoObra, tasks } = params

    // Delete all existing rows for this (project, tipo)
    const { error: deleteError } = await this.supabase
      .from('template_tareas')
      .delete()
      .eq('project_id', projectId)
      .eq('tipo_obra', tipoObra)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    if (tasks.length === 0) {
      return
    }

    const rows = tasks.map((task) => ({
      id: task.id ?? undefined,
      project_id: projectId,
      tipo_obra: tipoObra,
      version: ACTIVE_VERSION,
      status: ACTIVE_STATUS,
      nombre: task.nombre,
      duracion_dias: task.duracionDias,
      depende_de_template_id: task.dependeDeTemplateId,
      orden: task.orden,
    }))

    const { error } = await this.supabase
      .from('template_tareas')
      .insert(rows)

    if (error) {
      throw new Error(error.message)
    }
  }

  // ─── Obra bootstrap (unchanged) ─────────────────────────────────────────

  /**
   * Bootstrap a new obra from template using the atomic RPC.
   */
  public async createObraFromTemplate(params: CreateObraFromTemplateInput): Promise<Uuid> {
    const { projectId, nombre, cliente, tipoObra, fechaInicioGlobal, vigenciaTexto, tareas } = params

    // RPC contract expects snake_case keys inside JSONB payload.
    const rpcTareas = tareas.map((tarea) => {
      const duracionDias = Number(tarea.duracionDias)
      if (!Number.isFinite(duracionDias) || duracionDias < 1) {
        throw new Error(`INVALID_TEMPLATE_DURATION:${tarea.id}:${String(tarea.duracionDias)}`)
      }

      // Keep snake_case for RPC contract and camelCase as compatibility fallback.
      return {
        id: tarea.id,
        nombre: tarea.nombre,
        duracion_dias: duracionDias,
        duracionDias,
        depende_de_id: tarea.dependeDeId,
        dependeDeId: tarea.dependeDeId,
        orden: tarea.orden,
      }
    })

    const { data, error } = await this.supabase.rpc('create_obra_with_tasks', {
      p_project_id: projectId,
      p_nombre: nombre,
      p_cliente: cliente,
      p_tipo_obra: tipoObra,
      p_fecha_inicio_global: fechaInicioGlobal,
      p_vigencia_texto: vigenciaTexto,
      p_tareas: rpcTareas,
    })

    if (error) {
      throw new Error(error.message)
    }

    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('RPC create_obra_with_tasks did not return a valid obra ID')
    }

    return data
  }

  // ─── Mapper ──────────────────────────────────────────────────────────────

  private readonly mapRow = (row: DbTemplateTareaRow): TemplateTarea => ({
    id: row.id,
    projectId: row.project_id,
    tipoObra: row.tipo_obra,
    version: row.version,
    status: row.status === 'published' ? 'published' : 'draft',
    nombre: row.nombre,
    duracionDias: row.duracion_dias,
    dependeDeTemplateId: row.depende_de_template_id,
    orden: row.orden,
  })
}
