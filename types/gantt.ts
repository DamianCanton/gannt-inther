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

export interface ObraSchedule {
  obra: ObraInput;
  tasks: TaskInput[];
  dependencies: TaskDependency[];
  holidays: Set<IsoDate>;
}
