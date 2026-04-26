'use client'

import { type FormEvent, useEffect, useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { HelpPopover } from '@/components/ui/help-popover'
import { Input } from '@/components/ui/input'
import { detectSmartInsertConflict, type SmartInsertConflict } from '@/lib/domain/smart-insert'
import type { ScheduleTask, Uuid } from '@/types/gantt'

import type { GanttEditIntent, GanttEditorMode, SmartInsertPayload } from './gantt-types'
import { SmartInsertModal } from './smart-insert-modal'

// ---------------------------------------------------------------------------
// Discriminated union props for TaskEditor
// ---------------------------------------------------------------------------

interface TaskEditorCreateProps {
  mode: 'create'
  tasks: ScheduleTask[]
  selectedTaskId?: never
  selectedTask?: never
  onSelectTask?: never
}

interface TaskEditorEditProps {
  mode: 'edit'
  tasks: ScheduleTask[]
  selectedTaskId: Uuid | null
  selectedTask: ScheduleTask | null
  onSelectTask: (taskId: Uuid | null) => void
}

export type TaskEditorProps = (TaskEditorCreateProps | TaskEditorEditProps) & {
  disabled?: boolean
  pending?: boolean
  error?: string | null
  onSubmit: (payload: GanttEditIntent) => Promise<{ error?: string } | void>
  onCancel?: () => void
  onDelete?: (taskId: Uuid) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSubmitLabel(intent: GanttEditorMode): string {
  if (intent === 'create') {
    return 'Crear tarea'
  }

  if (intent === 'delete') {
    return 'Eliminar tarea'
  }

  return 'Guardar cambios'
}

function getTaskLevelLabel(task: ScheduleTask | null): string {
  if (!task) {
    return 'Creá una tarea base o una subtarea.'
  }

  return (task.parentId ?? null) === null
    ? 'Tarea base: puede tener duración manual y dependencias.'
    : 'Subtarea: su duración y offset describen un desglose dentro de su padre.'
}

function getParentSelectionHint(isChildTask: boolean): string {
  if (isChildTask) {
    return 'Esta tarea ahora es subtarea: hereda la lógica del grupo y deja de usar dependencia externa.'
  }

  return 'Sin padre la tarea queda en nivel superior y puede depender de otra.'
}

function hasAdvancedConfiguration(task: ScheduleTask | null): boolean {
  if (!task) {
    return false
  }

  return Boolean(task.parentId) || (task.offsetDias ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskEditor(props: TaskEditorProps) {
  const {
    mode,
    tasks,
    disabled = false,
    pending = false,
    error: externalError,
    onSubmit,
    onCancel,
    onDelete,
  } = props

  // In edit mode, derive values from props
  const selectedTaskId = mode === 'edit' ? props.selectedTaskId : undefined
  const selectedTask = mode === 'edit' ? props.selectedTask : undefined
  const onSelectTask = mode === 'edit' ? props.onSelectTask : undefined

  // Internal form state
  const [intent, setIntent] = useState<GanttEditorMode>('create')
  const [nombre, setNombre] = useState('')
  const [duracionDias, setDuracionDias] = useState(1)
  const [dependeDeId, setDependeDeId] = useState<Uuid | ''>('')
  const [parentId, setParentId] = useState<Uuid | ''>('')
  const [offsetDias, setOffsetDias] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [localError, setLocalError] = useState<string | null>(externalError ?? null)
  const [saving, setSaving] = useState(false)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)

  // Smart insert conflict resolution state
  const [pendingConflict, setPendingConflict] = useState<SmartInsertConflict | null>(null)
  const [pendingPayload, setPendingPayload] = useState<GanttEditIntent | null>(null)
  const formFieldPrefix = useId()
  const isChildTask = Boolean(parentId)

  const nameInputId = `${formFieldPrefix}-name`
  const durationInputId = `${formFieldPrefix}-duration`
  const parentInputId = `${formFieldPrefix}-parent`
  const dependencyInputId = `${formFieldPrefix}-dependency`

  // Predecessor candidates for the dependency select
  const predecessorCandidates = useMemo(() => {
    if (intent === 'create') {
      return tasks
    }

    if (!selectedTask) {
      return []
    }

    return tasks.filter((task) => task.id !== selectedTask.id)
  }, [tasks, selectedTask, intent])

  // Sync form fields from a task seed
  function syncFormFromTask(task: ScheduleTask | null) {
    if (!task) {
      setNombre('')
      setDuracionDias(1)
      setDependeDeId('')
      setParentId('')
      setOffsetDias(0)
      setShowAdvancedControls(false)
      return
    }

    setNombre(task.nombre)
    setDuracionDias(task.duracionDias)
    const nextParentId = task.parentId ?? ''
    setParentId(nextParentId)
    setDependeDeId(nextParentId ? '' : (task.dependeDeId ?? ''))
    setOffsetDias(task.offsetDias ?? 0)
    setShowAdvancedControls(hasAdvancedConfiguration(task))
  }

  const parentCandidates = useMemo(() => {
    const topLevelTasks = tasks.filter((task) => (task.parentId ?? null) === null)
    if (!selectedTask) {
      return topLevelTasks
    }

    return topLevelTasks.filter((task) => task.id !== selectedTask.id)
  }, [tasks, selectedTask])

  // When selectedTask changes externally (from GanttInteractive), sync the form
  useEffect(() => {
    if (intent !== 'create') {
      syncFormFromTask(selectedTask ?? null)
    }
    // We only react to external task selection changes, not internal intent changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.id])

  // Switch the internal action intent
  function startIntent(nextIntent: GanttEditorMode) {
    setIntent(nextIntent)
    setConfirmDelete(false)
    setLocalError(null)

    if (nextIntent === 'create') {
      onSelectTask?.(null)
      syncFormFromTask(null)
      return
    }

    syncFormFromTask(selectedTask ?? null)
  }

  // Handle task selection from the dropdown
  function handleSelectTask(taskId: string) {
    const nextTask = tasks.find((task) => task.id === taskId) ?? null
    onSelectTask?.(nextTask?.id ?? null)
    syncFormFromTask(nextTask)
  }

  // Handle the form submit flow
  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (disabled) {
      setLocalError('No hay datos disponibles para editar.')
      return
    }

    if (intent !== 'create' && !selectedTask) {
      setLocalError('Seleccioná una tarea para continuar.')
      return
    }

    if (intent !== 'delete' && nombre.trim().length === 0) {
      setLocalError('El nombre es obligatorio.')
      return
    }

    if (intent !== 'delete' && duracionDias < 1) {
      setLocalError('La duración debe ser mayor o igual a 1 día.')
      return
    }

    if (intent !== 'delete' && (!Number.isInteger(offsetDias) || offsetDias < 0)) {
      setLocalError('El offset debe ser mayor o igual a 0 días.')
      return
    }

    if (intent === 'delete' && !confirmDelete) {
      setLocalError('Confirmá la eliminación para continuar.')
      return
    }

    const activeTask = selectedTask
    if (intent !== 'create' && !activeTask) {
      setLocalError('Seleccioná una tarea para continuar.')
      return
    }
    const activeTaskId = activeTask?.id
    const normalizedParentId = parentId || null
    const normalizedDependencyId = normalizedParentId ? null : (dependeDeId || null)
    const normalizedOffset = normalizedParentId ? offsetDias : 0

    // If delete mode with onDelete callback, delegate to parent
    if (intent === 'delete' && onDelete && activeTaskId) {
      onDelete(activeTaskId)
      return
    }

    // Build the base payload
    const basePayload: GanttEditIntent =
      intent === 'create'
        ? {
            intent: 'create',
            nombre: nombre.trim(),
            duracionDias,
            dependeDeId: normalizedDependencyId,
            parentId: normalizedParentId,
            offsetDias: normalizedOffset,
          }
        : intent === 'update'
          ? {
              intent: 'update',
              taskId: activeTaskId as Uuid,
              nombre: nombre.trim(),
              duracionDias,
              dependeDeId: normalizedDependencyId,
              parentId: normalizedParentId,
              offsetDias: normalizedOffset,
            }
          : {
              intent: 'delete',
              taskId: activeTaskId as Uuid,
            }

    // Smart insert conflict detection (only for create/update with a dependency)
    if (intent !== 'delete' && normalizedDependencyId) {
      const conflict = detectSmartInsertConflict({
        parentId: normalizedDependencyId,
        tasks,
        excludeTaskId: intent === 'update' ? activeTaskId : undefined,
      })

      if (conflict) {
        // Store the pending payload and show the resolution modal
        setPendingPayload(basePayload)
        setPendingConflict(conflict)
        return
      }
    }

    await submitPayload(basePayload)
  }

  // Submit a payload to the parent
  async function submitPayload(payload: GanttEditIntent) {
    setSaving(true)
    setLocalError(null)

    try {
      const result = await onSubmit(payload)

      if (result?.error) {
        setLocalError(result.error)
        return
      }

      if (intent === 'create') {
        setNombre('')
        setDuracionDias(1)
        setDependeDeId('')
        setParentId('')
        setOffsetDias(0)
      }

      if (intent !== 'create') {
        syncFormFromTask(selectedTask ?? null)
      }

      setConfirmDelete(false)
      onCancel?.()
    } catch {
      setLocalError(
        intent === 'create'
          ? 'No se pudo crear la tarea. Intentá nuevamente.'
          : intent === 'update'
            ? 'No se pudo guardar los cambios de la tarea. Intentá nuevamente.'
            : 'No se pudo eliminar la tarea. Intentá nuevamente.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Handle smart insert strategy confirmation from the modal
  async function handleSmartInsertConfirm(strategy: 'insert' | 'branch') {
    if (!pendingPayload || !pendingConflict) {
      return
    }

    const smartInsert: SmartInsertPayload = {
      strategy,
      conflictParentId: pendingConflict.parentId,
      conflictChildId: pendingConflict.childId,
    }

    // Inject smartInsert into the pending payload
    const resolvedPayload: GanttEditIntent =
      pendingPayload.intent === 'create'
        ? { ...pendingPayload, smartInsert }
        : pendingPayload.intent === 'update'
          ? { ...pendingPayload, smartInsert }
          : pendingPayload

    setPendingConflict(null)
    setPendingPayload(null)

    await submitPayload(resolvedPayload)
  }

  // Handle smart insert modal cancel
  function handleSmartInsertCancel() {
    setPendingConflict(null)
    setPendingPayload(null)
  }

  const mergedError = externalError ?? localError
  const isPending = saving || pending

  return (
    <form
      className="space-y-3 rounded border border-gray-200 bg-white p-4"
      onSubmit={submitForm}
      aria-busy={isPending}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Editor de tarea</h2>
          <p className="text-sm text-gray-500">Primero resolvé nombre, duración, dependencia y jerarquía. Lo avanzado aparece si hace falta.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || isPending}
          onClick={() => {
            onSelectTask?.(null)
            syncFormFromTask(null)
            onCancel?.()
          }}
        >
          Limpiar
        </Button>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">Acción</legend>
        <div className="flex flex-wrap gap-2">
          {(['create', 'update', 'delete'] as const).map((modeOption) => (
            <Button
              key={modeOption}
              type="button"
              variant={intent === modeOption ? 'secondary' : 'ghost'}
              disabled={disabled || isPending}
              onClick={() => startIntent(modeOption)}
            >
              {modeOption === 'create' ? 'Crear' : modeOption === 'update' ? 'Editar' : 'Eliminar'}
            </Button>
          ))}
        </div>
      </fieldset>

      {intent !== 'create' ? (
        <label className="block text-sm font-medium text-gray-700">
          Tarea
          <select
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            value={selectedTaskId ?? ''}
            onChange={(event) => handleSelectTask(event.target.value)}
            disabled={disabled || isPending}
          >
            <option value="">Seleccioná una tarea</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {intent !== 'delete' ? (
        <div className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor={nameInputId} className="text-sm font-medium text-gray-700">
              Nombre
            </label>
            <HelpPopover
              label="Ayuda para Nombre"
              content="¿Qué nombre corto y claro le ponemos? (ej: Hormigonado Losa)"
            />
          </div>
          <Input
            id={nameInputId}
            aria-label="Nombre"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            disabled={disabled || isPending || (intent !== 'create' && !selectedTask)}
            helperText="Poné un nombre corto y claro: se usa en el gráfico y en la impresión."
          />
        </div>
      ) : null}

      {intent !== 'delete' ? (
        <div className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor={durationInputId} className="text-sm font-medium text-gray-700">
              Duración (días hábiles)
            </label>
            <HelpPopover
              label="Ayuda para Duración"
              content="¿Cuántos días laborables enteros va a llevar? (no cuenta fines de semana ni feriados)"
            />
          </div>
          <Input
            id={durationInputId}
            aria-label="Duración (días hábiles)"
            type="number"
            min={1}
            value={duracionDias}
            onChange={(event) => setDuracionDias(Number(event.target.value || 1))}
            disabled={disabled || isPending || (intent !== 'create' && !selectedTask)}
            helperText={getTaskLevelLabel(selectedTask ?? null)}
          />
        </div>
      ) : null}

      {intent !== 'delete' ? (
        <div className="space-y-1.5 rounded-lg border border-gray-200 bg-slate-50 p-3">
          <label htmlFor={dependencyInputId} className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            Dependencia
            <HelpPopover
              label="Ayuda para Dependencia"
              content="¿De qué otra tarea depende para poder arrancar? Se usa en tareas base; si elegís un padre, este campo se desactiva."
            />
          </label>
          <select
            id={dependencyInputId}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            value={dependeDeId}
            onChange={(event) => setDependeDeId(event.target.value)}
            disabled={disabled || isPending || isChildTask || (intent !== 'create' && !selectedTask)}
          >
            <option value="">Sin dependencia</option>
            {predecessorCandidates.map((task) => (
              <option key={task.id} value={task.id}>
                {task.nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600">Depende de otra tarea solo si no tiene padre. Si elegís un grupo, se apaga.</p>
        </div>
      ) : null}

      {intent !== 'delete' ? (
        <div className="space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/70 p-3">
          <button
            type="button"
            className="w-full rounded border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-white"
            aria-expanded={showAdvancedControls}
            onClick={() => setShowAdvancedControls((currentValue) => !currentValue)}
            disabled={disabled || isPending || (intent !== 'create' && !selectedTask)}
          >
            {showAdvancedControls ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
          </button>
          <p className="text-xs text-gray-600">
            Incluye jerarquía y offset para casos más complejos.
          </p>
        </div>
      ) : null}

      {intent !== 'delete' && showAdvancedControls ? (
        <div className="space-y-1.5 rounded-lg border border-gray-200 bg-amber-50/60 p-3">
          <label htmlFor={parentInputId} className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            Subtareas / Grupo
            <HelpPopover
              label="Ayuda para Subtareas o Grupo"
              content="Sin padre, la tarea es base. Cuando una tarea tiene padre, pasa a ser subtarea del grupo y su planificación se ordena dentro de ese bloque. Si no tiene padre, queda como tarea base y puede usar dependencia externa para arrancar después de otra."
            />
          </label>
          <select
            id={parentInputId}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            value={parentId}
            onChange={(event) => {
              const nextParentId = event.target.value as Uuid | ''
              setParentId(nextParentId)

              if (nextParentId) {
                setDependeDeId('')
              } else {
                setOffsetDias(0)
              }
            }}
            disabled={disabled || isPending || (intent !== 'create' && !selectedTask)}
          >
            <option value="">Sin padre (nivel superior)</option>
            {parentCandidates.map((task) => (
              <option key={task.id} value={task.id}>
                {task.nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600">{getParentSelectionHint(isChildTask)}</p>
        </div>
      ) : null}

      {intent !== 'delete' && showAdvancedControls ? (
        <div className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-3">
          <Input
            label="Offset (días hábiles)"
            aria-label="Offset (días hábiles)"
            type="number"
            min={0}
            value={offsetDias}
            onChange={(event) => setOffsetDias(Number(event.target.value || 0))}
            disabled={disabled || isPending || !parentId || (intent !== 'create' && !selectedTask)}
            helperText="Solo se usa cuando la tarea tiene padre. Es el corrimiento interno dentro del bloque."
          />
        </div>
      ) : null}

      {intent !== 'delete' ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Si la tarea tiene padre, se vuelve subtarea. Sin padre queda en nivel superior.
        </div>
      ) : null}

      {intent === 'delete' ? (
        <label className="flex items-center gap-2 text-sm text-red-700">
          <input
            type="checkbox"
            checked={confirmDelete}
            onChange={(event) => setConfirmDelete(event.target.checked)}
            disabled={disabled || isPending || !selectedTask}
          />
          Confirmo que quiero eliminar esta tarea
        </label>
      ) : null}

      {isPending ? (
        <p role="status" aria-live="polite" className="text-sm text-blue-700">
          {intent === 'create'
            ? 'Creando tarea...'
            : intent === 'update'
              ? 'Guardando cambios de la tarea...'
              : 'Eliminando tarea...'}
        </p>
      ) : null}

      {mergedError ? <p className="text-sm text-red-600">{mergedError}</p> : null}

      <Button
        type="submit"
        disabled={
          disabled || isPending || (intent !== 'create' && !selectedTask) || (intent === 'delete' && !confirmDelete)
        }
      >
        {isPending
          ? intent === 'create'
            ? 'Creando...'
            : intent === 'update'
              ? 'Guardando...'
              : 'Eliminando...'
          : getSubmitLabel(intent)}
      </Button>

      {pendingConflict ? (
        <SmartInsertModal
          conflict={{ parentName: pendingConflict.parentName, childName: pendingConflict.childName }}
          onConfirm={handleSmartInsertConfirm}
          onCancel={handleSmartInsertCancel}
          isPending={saving}
        />
      ) : null}
    </form>
  )
}
