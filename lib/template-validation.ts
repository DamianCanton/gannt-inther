import { detectCycle } from '@/lib/gantt-dag'
import type { TemplateTarea, Uuid } from '@/types/gantt'

export class TemplateValidationError extends Error {
  public constructor(
    public readonly code: 'CYCLE_DETECTED' | 'INVALID_DURATION' | 'SELF_DEPENDENCY' | 'MISSING_NAME' | 'EMPTY_TEMPLATE',
    message: string
  ) {
    super(message)
    this.name = 'TemplateValidationError'
  }
}

/**
 * Validate a set of template tasks for DAG correctness and business rules.
 *
 * Checks:
 * - No empty templates
 * - All tasks have valid names and positive durations
 * - No self-dependencies
 * - All dependency references are within the template set
 * - Acyclicity (DAG)
 */
export function validateTemplateTasks(tasks: Pick<TemplateTarea, 'id' | 'nombre' | 'duracionDias' | 'dependeDeTemplateId' | 'orden'>[]): void {
  if (tasks.length === 0) {
    throw new TemplateValidationError('EMPTY_TEMPLATE', 'La plantilla debe contener al menos una tarea.')
  }

  const taskIds = new Set(tasks.map((t) => t.id))

  for (const task of tasks) {
    // Name validation
    if (!task.nombre || task.nombre.trim().length === 0) {
      throw new TemplateValidationError('MISSING_NAME', `La tarea en posición ${task.orden} no tiene nombre.`)
    }

    // Duration validation
    if (task.duracionDias < 1) {
      throw new TemplateValidationError('INVALID_DURATION', `La tarea "${task.nombre}" tiene duración inválida: ${task.duracionDias}`)
    }

    // Self-dependency
    if (task.dependeDeTemplateId === task.id) {
      throw new TemplateValidationError('SELF_DEPENDENCY', `La tarea "${task.nombre}" depende de sí misma.`)
    }

    // External dependency reference
    if (task.dependeDeTemplateId !== null && !taskIds.has(task.dependeDeTemplateId)) {
      throw new TemplateValidationError(
        'CYCLE_DETECTED',
        `La tarea "${task.nombre}" depende de una tarea que no existe en la plantilla.`
      )
    }
  }

  // Cycle detection using the existing DAG engine
  const dagTasks = tasks.map((t) => ({
    id: t.id,
    dependeDeId: t.dependeDeTemplateId,
    orden: t.orden,
    projectId: '' as Uuid,
    obraId: '' as Uuid,
    nombre: t.nombre,
    duracionDias: t.duracionDias,
  }))

  const cycle = detectCycle(dagTasks)
  if (cycle.length > 0) {
    throw new TemplateValidationError(
      'CYCLE_DETECTED',
      `Dependencia circular detectada: ${cycle.join(' → ')}`
    )
  }
}

/**
 * Validate that a published template can be safely published.
 * This is the same as validateTemplateTasks but with a specific error message.
 */
export function validateForPublish(tasks: Pick<TemplateTarea, 'id' | 'nombre' | 'duracionDias' | 'dependeDeTemplateId' | 'orden'>[]): void {
  validateTemplateTasks(tasks)
}
