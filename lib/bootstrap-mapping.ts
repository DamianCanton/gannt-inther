import type { ObraBootstrapTarea, TemplateTarea, Uuid } from '@/types/gantt'

const defaultGenerateId: () => Uuid =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID.bind(crypto)
    : () => `${Date.now()}-${Math.random().toString(36).slice(2)}` as Uuid

/**
 * Pure function: remap template task IDs to new obra task IDs,
 * preserving the dependency graph structure.
 *
 * Each template ID gets a fresh UUID; dependencies are resolved
 * through the same mapping so the graph topology is preserved.
 */
export function remapTemplateToBootstrap(
  templateTasks: TemplateTarea[],
  generateId: () => Uuid = defaultGenerateId
): ObraBootstrapTarea[] {
  const idMapping = new Map<Uuid, Uuid>()

  for (const task of templateTasks) {
    idMapping.set(task.id, generateId())
  }

  return templateTasks.map((task) => ({
    id: idMapping.get(task.id)!,
    nombre: task.nombre,
    duracionDias: task.duracionDias,
    dependeDeId: task.dependeDeTemplateId
      ? idMapping.get(task.dependeDeTemplateId) ?? null
      : null,
    orden: task.orden,
  }))
}
