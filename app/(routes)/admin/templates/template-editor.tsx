'use client'

import { useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { TipoObra } from '@/types/gantt'

interface TemplateTask {
  id: string
  nombre: string
  duracionDias: number
  dependeDeTemplateId: string | null
  orden: number
}

interface TemplateEditorProps {
  saveAction: (formData: FormData) => Promise<void>
  loadTasksAction: (tipoObra: TipoObra) => Promise<{ tasks: TemplateTask[] }>
}

function createEmptyTask(orden: number): TemplateTask {
  return {
    id: crypto.randomUUID(),
    nombre: '',
    duracionDias: 1,
    dependeDeTemplateId: null,
    orden,
  }
}

function validateDraft(tasks: TemplateTask[]): string | null {
  if (tasks.length === 0) return 'La plantilla debe tener al menos una tarea.'

  for (const task of tasks) {
    if (!task.nombre.trim()) return `Tarea en posición ${task.orden + 1} sin nombre.`
    if (task.duracionDias < 1) return `Duración inválida en "${task.nombre}".`
    if (task.dependeDeTemplateId === task.id) return `"${task.nombre}" depende de sí misma.`
    if (task.dependeDeTemplateId && !tasks.some((candidate) => candidate.id === task.dependeDeTemplateId)) {
      return `"${task.nombre}" depende de una tarea inexistente.`
    }
  }

  return null
}

export function TemplateEditor({ saveAction, loadTasksAction }: TemplateEditorProps) {
  const [selectedType, setSelectedType] = useState<TipoObra>('SPLIT')
  const [tasks, setTasks] = useState<TemplateTask[]>([createEmptyTask(0)])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    loadTasksAction(selectedType)
      .then((result) => {
        if (cancelled) return
        if (result.tasks.length > 0) {
          setTasks(result.tasks)
        } else {
          setTasks([createEmptyTask(0)])
        }
        setHasLoaded(result.tasks.length > 0)
      })
      .catch(() => {
        if (cancelled) return
        setTasks([createEmptyTask(0)])
        setHasLoaded(false)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedType, loadTasksAction])

  const addTask = () => {
    setTasks((previous) => [...previous, createEmptyTask(previous.length)])
  }

  const removeTask = (id: string) => {
    setTasks((previous) => {
      const filtered = previous.filter((task) => task.id !== id)
      return filtered.map((task, index) => ({
        ...task,
        orden: index,
        dependeDeTemplateId: task.dependeDeTemplateId === id ? null : task.dependeDeTemplateId,
      }))
    })
  }

  const updateTask = (id: string, field: keyof TemplateTask, value: string | number | null) => {
    setTasks((previous) => previous.map((task) => (task.id === id ? { ...task, [field]: value } : task)))
  }

  const moveTask = (id: string, direction: 'up' | 'down') => {
    setTasks((previous) => {
      const index = previous.findIndex((task) => task.id === id)
      if (index === -1) return previous
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= previous.length) return previous

      const next = [...previous]
      const [moved] = next.splice(index, 1)
      if (!moved) return previous
      next.splice(targetIndex, 0, moved)

      return next.map((task, nextIndex) => ({ ...task, orden: nextIndex }))
    })
  }

  const handleTypeChange = (tipo: TipoObra) => {
    setSelectedType(tipo)
    setValidationError(null)
  }

  const handleSave = () => {
    const error = validateDraft(tasks)
    if (error) {
      setValidationError(error)
      return
    }

    setValidationError(null)
    const formData = new FormData()
    formData.set('tipoObra', selectedType)
    formData.set('tasks', JSON.stringify(tasks))

    startTransition(() => saveAction(formData))
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['SPLIT', 'OTM', 'Respaldo'] as TipoObra[]).map((tipo) => (
            <Button
              key={tipo}
              variant={selectedType === tipo ? 'default' : 'secondary'}
              onClick={() => handleTypeChange(tipo)}
              disabled={isPending}
            >
              {tipo}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-500">
            Cargando plantilla…
          </div>
        ) : hasLoaded ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Plantilla activa — {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600">
            Sin plantilla para {selectedType}. Creá la primera.
          </div>
        )}

        {validationError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {validationError}
          </div>
        ) : null}
      </Card>

      <div className="space-y-3">
        <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">Tareas — {selectedType}</h2>

        {isLoading ? (
          <Card>
            <p className="text-sm text-gray-500">Cargando tareas…</p>
          </Card>
        ) : (
          tasks.map((task, index) => (
            <Card key={task.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-8 font-mono text-sm tabular-nums text-gray-500">{index + 1}.</span>

                <div className="min-w-[200px] flex-1">
                  <Input
                    className="w-full"
                    placeholder="Nombre de la tarea"
                    value={task.nombre}
                    onChange={(event) => updateTask(task.id, 'nombre', event.target.value)}
                  />
                </div>

                <div className="w-20">
                  <Input
                    className="w-full text-center"
                    type="number"
                    min={1}
                    value={task.duracionDias}
                    onChange={(event) => updateTask(task.id, 'duracionDias', Number(event.target.value))}
                    title="Duración en días hábiles"
                  />
                </div>
                <span className="text-xs text-gray-500">días</span>

                <Select
                  className="min-w-[160px]"
                  value={task.dependeDeTemplateId ?? ''}
                  onChange={(event) => updateTask(task.id, 'dependeDeTemplateId', event.target.value || null)}
                >
                  <option value="">Sin dependencia</option>
                  {tasks
                    .filter((candidate) => candidate.id !== task.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        → {candidate.nombre || `Tarea ${candidate.orden + 1}`}
                      </option>
                    ))}
                </Select>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTask(task.id, 'up')}
                    disabled={index === 0}
                    title="Mover arriba"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTask(task.id, 'down')}
                    disabled={index === tasks.length - 1}
                    title="Mover abajo"
                  >
                    ↓
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTask(task.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Eliminar"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}

        <Button variant="secondary" onClick={addTask} disabled={isLoading}>
          + Agregar tarea
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
