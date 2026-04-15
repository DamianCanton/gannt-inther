export type Uuid = string;

export type IsoDate = `${number}-${number}-${number}`;

export type DependencyKind = "FS";

export interface TaskDependency {
  taskId: Uuid;
  dependsOnTaskId: Uuid;
  kind: DependencyKind;
}

export interface TaskInput {
  id: Uuid;
  projectId: Uuid;
  obraId: Uuid;
  nombre: string;
  duracionDias: number;
  dependeDeId: Uuid | null;
  orden: number;
}

export interface ScheduleTask extends TaskInput {
  fechaInicio: IsoDate;
  fechaFin: IsoDate;
}

export interface RecalculateParams {
  tasks: TaskInput[];
  dependencies: TaskDependency[];
  obraStartDate: IsoDate;
  holidays: Set<IsoDate>;
  changedTaskId?: Uuid;
}

export type ScheduleError =
  | { code: 'CYCLE_DETECTED'; cycleTaskIds: Uuid[] }
  | { code: 'INVALID_DURATION'; taskId: Uuid; duration: number };

export interface RecalculateResult {
  tasks: ScheduleTask[];
  changedTaskIds?: Uuid[];
}

export interface ObraInput {
  id: Uuid;
  projectId: Uuid;
  nombre: string;
  cliente: string | null;
  tipoObra: "Tipo A" | "Tipo B" | "Tipo C";
  fechaInicioGlobal: IsoDate;
  vigenciaTexto: string | null;
}

/**
 * DTO para el listado de obras (/obras).
 * Incluye conteo de tareas calculado por agregación SQL en el repositorio.
 */
export interface ObraDTO {
  id: Uuid;
  projectId: Uuid;
  nombre: string;
  cliente: string | null;
  tipoObra: "Tipo A" | "Tipo B" | "Tipo C";
  fechaInicioGlobal: IsoDate;
  vigenciaTexto: string | null;
  taskCount: number;
}

export interface ObraSchedule {
  obra: ObraInput;
  tasks: TaskInput[];
  dependencies: TaskDependency[];
  holidays: Set<IsoDate>;
}

// ============================================================
// Template types
// ============================================================

export type TipoObra = "Tipo A" | "Tipo B" | "Tipo C";

export type TemplateStatus = "draft" | "published" | "archived";

export interface TemplateTarea {
  id: Uuid;
  projectId: Uuid;
  tipoObra: TipoObra;
  version: number;
  status: TemplateStatus;
  nombre: string;
  duracionDias: number;
  dependeDeTemplateId: Uuid | null;
  orden: number;
}

/**
 * Precomputed tarea payload for the create_obra_with_tasks RPC.
 * Dependencies are already resolved from template IDs to new tarea UUIDs.
 */
export interface ObraBootstrapTarea {
  id: Uuid;
  nombre: string;
  duracionDias: number;
  dependeDeId: Uuid | null;
  orden: number;
}
