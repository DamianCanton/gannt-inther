'use client'

import React, { useCallback, useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { TipoObra } from '@/types/gantt'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    if (task.dependeDeTemplateId && !tasks.some((t) => t.id === task.dependeDeTemplateId)) {
      return `"${task.nombre}" depende de una tarea inexistente.`
    }
  }

  return null
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TemplateEditor({ saveAction, loadTasksAction }: TemplateEditorProps) {
  const [selectedType, setSelectedType] = useState<TipoObra>('Tipo A')
  const [tasks, setTasks] = useState<TemplateTask[]>([createEmptyTask(0)])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Hydrate editor when component mounts or tipo changes
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

    return () => { cancelled = true }
  }, [selectedType, loadTasksAction])

  const addTask = () => {
    setTasks((prev) => [...prev, createEmptyTask(prev.length)])
  }

  const removeTask = (id: string) => {
    setTasks((prev) => {
      const filtered = prev.filter((t) => t.id !== id)
      return filtered.map((t, i) => ({
        ...t,
        orden: i,
        dependeDeTemplateId: t.dependeDeTemplateId === id ? null : t.dependeDeTemplateId,
      }))
    })
  }

  const updateTask = (id: string, field: keyof TemplateTask, value: string | number | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    )
  }

  const moveTask = (id: string, direction: 'up' | 'down') => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= prev.length) return prev

      const next = [...prev]
      const removed = next.splice(idx, 1)
      const moved = removed[0]
      if (!moved) return prev
      next.splice(targetIdx, 0, moved)

      return next.map((t, i) => ({ ...t, orden: i }))
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
      {/* Type selector */}
      <div className="flex gap-2">
        {(['Tipo A', 'Tipo B', 'Tipo C'] as TipoObra[]).map((tipo) => (
          <Button
            key={tipo}
            variant={selectedType === tipo ? 'primary' : 'secondary'}
            onClick={() => handleTypeChange(tipo)}
            disabled={isPending}
          >
            {tipo}
          </Button>
        ))}
      </div>

      {/* Status */}
      {isLoading ? (
        <Card className="bg-gray-50 border-gray-200">
          <p className="text-sm text-gray-500">Cargando plantilla…</p>
        </Card>
      ) : hasLoaded ? (
        <Card className="bg-green-50 border-green-200">
          <p className="text-sm text-green-800">
            Plantilla activa — {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}.
          </p>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <p className="text-sm text-gray-600">
            Sin plantilla para {selectedType}. Creá la primera.
          </p>
        </Card>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {validationError}
        </div>
      )}

      {/* Task editor */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Tareas — {selectedType}</h2>

        {isLoading ? (
          <Card>
            <p className="text-sm text-gray-500">Cargando tareas…</p>
          </Card>
        ) : tasks.map((task, index) => (
          <Card key={task.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-mono text-gray-500 w-8">
                {index + 1}.
              </span>

              <input
                className="flex-1 min-w-[200px] rounded border border-gray-300 px-3 py-2"
                placeholder="Nombre de la tarea"
                value={task.nombre}
                onChange={(e) => updateTask(task.id, 'nombre', e.target.value)}
              />

              <input
                className="w-20 rounded border border-gray-300 px-3 py-2 text-center"
                type="number"
                min={1}
                value={task.duracionDias}
                onChange={(e) => updateTask(task.id, 'duracionDias', Number(e.target.value))}
                title="Duración en días hábiles"
              />
              <span className="text-xs text-gray-500">días</span>

              <select
                className="rounded border border-gray-300 px-3 py-2 min-w-[160px]"
                value={task.dependeDeTemplateId ?? ''}
                onChange={(e) =>
                  updateTask(task.id, 'dependeDeTemplateId', e.target.value || null)
                }
              >
                <option value="">Sin dependencia</option>
                {tasks
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      → {t.nombre || `Tarea ${t.orden + 1}`}
                    </option>
                  ))}
              </select>

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
        ))}

        <Button variant="secondary" onClick={addTask} disabled={isLoading}>
          + Agregar tarea
        </Button>
      </div>

      {/* Single action */}
      <div className="border-t border-gray-200 pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
