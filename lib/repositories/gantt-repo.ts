import 'server-only'

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapMutationErrorToDomainCode,
  TaskMutationError,
  type TaskMutationIntent,
} from "@/lib/domain/gantt-crud-service";

import type {
  IsoDate,
  ObraDTO,
  ObraSchedule,
  TaskDependency,
  TaskInput,
  Uuid,
} from "../../types/gantt";

export class RepoAccessError extends Error {
  public readonly code: 'FORBIDDEN_OR_NOT_FOUND'

  public constructor(message = 'FORBIDDEN_OR_NOT_FOUND') {
    super(message)
    this.name = 'RepoAccessError'
    this.code = 'FORBIDDEN_OR_NOT_FOUND'
  }
}

type DbTaskRow = {
  id: string;
  project_id: string;
  obra_id: string;
  nombre: string;
  duracion_dias: number;
  depende_de_id: string | null;
  parent_id: string | null;
  offset_dias: number;
  orden: number;
};

type DbDependencyRow = {
  tarea_id: string;
  depende_de_id: string;
};

type DbObraRow = {
  id: string;
  project_id: string;
  nombre: string;
  cliente: string | null;
  tipo_obra: "Tipo A" | "Tipo B" | "Tipo C";
  fecha_inicio_global: string;
  vigencia_texto: string | null;
};

type DbHolidayRow = {
  fecha: string;
};

type MutateTaskGraphPayload = {
  nombre?: string;
  duracion_dias?: number;
  depende_de_id?: string | null;
  parent_id?: string | null;
  offset_dias?: number;
  smart_insert?: {
    strategy: 'insert' | 'branch';
    conflictParentId: string;
    conflictChildId: string;
  };
};

type CreateObraInput = {
  nombre: string;
  cliente: string | null;
  tipoObra: "Tipo A" | "Tipo B" | "Tipo C";
  fechaInicioGlobal: IsoDate;
  vigenciaTexto: string | null;
};

export class GanttRepo {
  public constructor(private readonly supabase: SupabaseClient) {}

  private assertValidDuration(taskId: string, duration: number): void {
    if (duration < 1) {
      throw new Error(`INVALID_DURATION:${taskId}:${duration}`)
    }
  }

  /**
   * Lista todas las obras de un proyecto con su conteo de tareas.
   * Utiliza un JOIN anidado de PostgREST (tareas(count)) para obtener el
   * taskCount directamente desde la DB, sin agregación en memoria.
   */
  public async listObras(projectId: Uuid): Promise<ObraDTO[]> {
    const { data, error } = await this.supabase
      .from("obras")
      .select(
        "id, project_id, nombre, cliente, tipo_obra, fecha_inicio_global, vigencia_texto, tareas(count)"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    type ObraWithCount = DbObraRow & {
      tareas: { count: number }[];
    };

    return (data ?? []).map<ObraDTO>((row) => {
      const typedRow = row as unknown as ObraWithCount;
      return {
        id: typedRow.id,
        projectId: typedRow.project_id,
        nombre: typedRow.nombre,
        cliente: typedRow.cliente,
        tipoObra: typedRow.tipo_obra,
        fechaInicioGlobal: typedRow.fecha_inicio_global as IsoDate,
        vigenciaTexto: typedRow.vigencia_texto,
        taskCount: typedRow.tareas?.[0]?.count ?? 0,
      };
    });
  }

  public async getObraSchedule(params: {
    projectId: Uuid;
    obraId: Uuid;
  }): Promise<ObraSchedule> {
    const { projectId, obraId } = params;

    const obraQuery = this.supabase
      .from("obras")
      .select("id, project_id, nombre, cliente, tipo_obra, fecha_inicio_global, vigencia_texto")
      .eq("id", obraId)
      .eq("project_id", projectId)
      .single<DbObraRow>();

    const tareasQuery = this.supabase
      .from("tareas")
      .select("id, project_id, obra_id, nombre, duracion_dias, depende_de_id, parent_id, offset_dias, orden")
      .eq("obra_id", obraId)
      .eq("project_id", projectId)
      .order("orden", { ascending: true })
      .returns<DbTaskRow[]>();

    const dependenciasQuery = this.supabase
      .from("dependencias")
      .select("tarea_id, depende_de_id")
      .eq("obra_id", obraId)
      .eq("project_id", projectId)
      .returns<DbDependencyRow[]>();

    const feriadosQuery = this.supabase
      .from("feriados")
      .select("fecha")
      .returns<DbHolidayRow[]>();

    const [obraRes, tareasRes, dependenciasRes, feriadosRes] = await Promise.all([
      obraQuery,
      tareasQuery,
      dependenciasQuery,
      feriadosQuery,
    ]);

    if (obraRes.error || !obraRes.data) {
      throw new RepoAccessError(obraRes.error?.message ?? "Obra no encontrada o fuera de scope");
    }
    if (tareasRes.error) {
      throw new Error(tareasRes.error.message);
    }
    if (dependenciasRes.error) {
      throw new Error(dependenciasRes.error.message);
    }
    if (feriadosRes.error) {
      throw new Error(feriadosRes.error.message);
    }

    return {
      obra: {
        id: obraRes.data.id,
        projectId: obraRes.data.project_id,
        nombre: obraRes.data.nombre,
        cliente: obraRes.data.cliente,
        tipoObra: obraRes.data.tipo_obra,
        fechaInicioGlobal: obraRes.data.fecha_inicio_global as IsoDate,
        vigenciaTexto: obraRes.data.vigencia_texto,
      },
      tasks: (tareasRes.data ?? []).map(this.mapTaskRow),
      dependencies: (dependenciasRes.data ?? []).map(this.mapDependencyRow),
      holidays: new Set((feriadosRes.data ?? []).map((row) => row.fecha as IsoDate)),
    };
  }

  public async mutateTaskGraphAtomic(params: {
    projectId: Uuid;
    obraId: Uuid;
    intent: TaskMutationIntent;
    taskId: Uuid | null;
    payload: MutateTaskGraphPayload;
  }): Promise<Uuid> {
    const { obraId, intent, taskId, payload } = params;

    // Log para debugging
    console.log('[GanttRepo.mutateTaskGraphAtomic] Calling RPC with:', {
      intent,
      obra_id: obraId,
      task_id: taskId,
      payload: JSON.stringify(payload),
    })

    const { data, error } = await this.supabase.rpc("mutate_task_graph", {
      intent,
      obra_id: obraId,
      task_id: taskId,
      payload,
    });

    if (error) {
      console.error('[GanttRepo.mutateTaskGraphAtomic] RPC error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw new TaskMutationError(
        mapMutationErrorToDomainCode(error),
        error.message
      );
    }

    if (typeof data !== "string" || data.length === 0) {
      throw new TaskMutationError(
        "ATOMIC_WRITE_FAILED",
        "Atomic mutation did not return a task identifier."
      );
    }

    return data;
  }

  public async createObra(params: {
    projectId: Uuid;
    input: CreateObraInput;
  }): Promise<Uuid> {
    const { projectId, input } = params;

    const { data, error } = await this.supabase
      .from("obras")
      .insert({
        project_id: projectId,
        nombre: input.nombre,
        cliente: input.cliente,
        tipo_obra: input.tipoObra,
        fecha_inicio_global: input.fechaInicioGlobal,
        vigencia_texto: input.vigenciaTexto,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      throw new Error(error.message);
    }

    return data.id;
  }

  public async deleteObra(params: {
    projectId: Uuid;
    obraId: Uuid;
  }): Promise<void> {
    const { projectId, obraId } = params;

    const { data, error } = await this.supabase
      .from("obras")
      .delete()
      .eq("project_id", projectId)
      .eq("id", obraId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new RepoAccessError("Obra no encontrada o fuera de scope");
    }
  }

  public async saveTask(params: {
    projectId: Uuid;
    obraId: Uuid;
    task: TaskInput;
  }): Promise<void> {
    const { projectId, obraId, task } = params;
    this.assertValidDuration(task.id, task.duracionDias)

    const { error } = await this.supabase.from("tareas").upsert(
      {
        id: task.id,
        project_id: projectId,
        obra_id: obraId,
        nombre: task.nombre,
        duracion_dias: task.duracionDias,
        depende_de_id: task.dependeDeId,
        parent_id: task.parentId ?? null,
        offset_dias: task.offsetDias ?? 0,
        orden: task.orden,
      },
      { onConflict: "id" }
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  public async saveDependency(params: {
    projectId: Uuid;
    obraId: Uuid;
    dependency: TaskDependency;
  }): Promise<void> {
    const { projectId, obraId, dependency } = params;

    const { error } = await this.supabase.from("dependencias").upsert(
      {
        project_id: projectId,
        obra_id: obraId,
        tarea_id: dependency.taskId,
        depende_de_id: dependency.dependsOnTaskId,
      },
      { onConflict: "tarea_id,depende_de_id" }
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  public async clearDependenciesForTask(params: {
    projectId: Uuid;
    obraId: Uuid;
    taskId: Uuid;
  }): Promise<void> {
    const { projectId, obraId, taskId } = params;

    const { error } = await this.supabase
      .from("dependencias")
      .delete()
      .eq("project_id", projectId)
      .eq("obra_id", obraId)
      .eq("tarea_id", taskId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private readonly mapTaskRow = (row: DbTaskRow): TaskInput => ({
    id: row.id,
    projectId: row.project_id,
    obraId: row.obra_id,
    nombre: row.nombre,
    duracionDias: (() => {
      this.assertValidDuration(row.id, row.duracion_dias)
      return row.duracion_dias
    })(),
    dependeDeId: row.depende_de_id,
    parentId: row.parent_id,
    offsetDias: row.offset_dias ?? 0,
    orden: row.orden,
  });

  private readonly mapDependencyRow = (row: DbDependencyRow): TaskDependency => ({
    taskId: row.tarea_id,
    dependsOnTaskId: row.depende_de_id,
    kind: "FS",
  });
}
