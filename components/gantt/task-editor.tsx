'use client'

import { type FormEvent, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ScheduleTask, Uuid } from '@/types/gantt'

import type { GanttEditIntent, GanttEditorMode } from './gantt-types'

export interface TaskEditorProps {
  tasks: ScheduleTask[]
  selectedTaskId: Uuid | null
  selectedTask: ScheduleTask | null
  disabled?: boolean
  pending?: boolean
  error?: string | null
  onSubmit: (payload: GanttEditIntent) => Promise<{ error?: string } | void>
  onSelectTask: (taskId: Uuid | null) => void
  onCancelIntent?: () => void
}

function getSubmitLabel(mode: GanttEditorMode): string {
  if (mode === 'create') {
    return 'Crear tarea'
  }

  if (mode === 'delete') {
    return 'Eliminar tarea'
  }

  return 'Guardar cambios'
}

export function TaskEditor({
  tasks,
  selectedTaskId,
  selectedTask,
  disabled = false,
  pending = false,
  error,
  onSubmit,
  onSelectTask,
  onCancelIntent,
}: TaskEditorProps) {
  const [intent, setIntent] = useState<GanttEditorMode>('create')
  const [nombre, setNombre] = useState('')
  const [duracionDias, setDuracionDias] = useState(1)
  const [dependeDeId, setDependeDeId] = useState<Uuid | ''>('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [localError, setLocalError] = useState<string | null>(error ?? null)
  const [saving, setSaving] = useState(false)

  const predecessorCandidates = useMemo(() => {
    if (intent === 'create') {
      return tasks
    }

    if (!selectedTask) {
      return []
    }

    return tasks.filter((task) => task.id !== selectedTask.id)
  }, [tasks, selectedTask, intent])

  function syncFormFromTask(task: ScheduleTask | null) {
    if (!task) {
      setNombre('')
      setDuracionDias(1)
      setDependeDeId('')
      return
    }

    setNombre(task.nombre)
    setDuracionDias(task.duracionDias)
    setDependeDeId(task.dependeDeId ?? '')
  }

  function startIntent(nextIntent: GanttEditorMode) {
    setIntent(nextIntent)
    setConfirmDelete(false)
    setLocalError(null)

    if (nextIntent === 'create') {
      onSelectTask(null)
      syncFormFromTask(null)
      return
    }

    syncFormFromTask(selectedTask)
  }

  function handleSelectTask(taskId: string) {
    const nextTask = tasks.find((task) => task.id === taskId) ?? null
    onSelectTask(nextTask?.id ?? null)
    syncFormFromTask(nextTask)
  }

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

    setSaving(true)
    setLocalError(null)

    const payload: GanttEditIntent =
      intent === 'create'
        ? {
            intent: 'create',
            nombre: nombre.trim(),
            duracionDias,
            dependeDeId: dependeDeId || null,
          }
        : intent === 'update'
          ? {
              intent: 'update',
              taskId: activeTaskId as Uuid,
              nombre: nombre.trim(),
              duracionDias,
              dependeDeId: dependeDeId || null,
            }
          : {
              intent: 'delete',
              taskId: activeTaskId as Uuid,
            }

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
      }

      if (intent !== 'create') {
        syncFormFromTask(selectedTask)
      }

      setConfirmDelete(false)
      onCancelIntent?.()
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

  const mergedError = error ?? localError

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
          <p className="text-sm text-gray-500">Los cambios se envían como intents al servidor.</p>
        </div>
        <Button type="button" variant="ghost" disabled={disabled || isPending} onClick={() => onSelectTask(null)}>
          Limpiar
        </Button>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">Acción</legend>
        <div className="flex flex-wrap gap-2">
          {(['create', 'update', 'delete'] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={intent === mode ? 'secondary' : 'ghost'}
              disabled={disabled || isPending}
              onClick={() => startIntent(mode)}
            >
              {mode === 'create' ? 'Crear' : mode === 'update' ? 'Editar' : 'Eliminar'}
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
        <Input
          label="Nombre"
          aria-label="Nombre"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          disabled={disabled || isPending || intent !== 'create' && !selectedTask}
        />
      ) : null}

      {intent !== 'delete' ? (
        <Input
          label="Duración (días hábiles)"
          aria-label="Duración (días hábiles)"
          type="number"
          min={1}
          value={duracionDias}
          onChange={(event) => setDuracionDias(Number(event.target.value || 1))}
          disabled={disabled || isPending || intent !== 'create' && !selectedTask}
        />
      ) : null}

      {intent !== 'delete' ? (
        <label className="block text-sm font-medium text-gray-700">
          Depende de
          <select
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            value={dependeDeId}
            onChange={(event) => setDependeDeId(event.target.value)}
            disabled={disabled || isPending || intent !== 'create' && !selectedTask}
          >
            <option value="">Sin dependencia</option>
            {predecessorCandidates.map((task) => (
              <option key={task.id} value={task.id}>
                {task.nombre}
              </option>
            ))}
          </select>
        </label>
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
        disabled={disabled || isPending || (intent !== 'create' && !selectedTask) || (intent === 'delete' && !confirmDelete)}
      >
        {isPending
          ? intent === 'create'
            ? 'Creando...'
            : intent === 'update'
              ? 'Guardando...'
              : 'Eliminando...'
          : getSubmitLabel(intent)}
      </Button>
    </form>
  )
}
