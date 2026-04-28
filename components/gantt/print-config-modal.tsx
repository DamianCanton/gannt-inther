'use client'

import type { PrintSelectionMode, Uuid } from '@/types/gantt'

export interface PrintConfigDraft {
  selectionMode: PrintSelectionMode
  includeOneDayTasks: boolean
  expandAllBeforePrint: boolean
  manualTaskIds: Uuid[]
}

export interface PrintTaskOption {
  id: Uuid
  nombre: string
  duracionDias: number
}

export interface PrintConfigModalProps {
  isOpen: boolean
  draft: PrintConfigDraft
  taskOptions: PrintTaskOption[]
  onClose: () => void
  onSelectionModeChange: (mode: PrintSelectionMode) => void
  onIncludeOneDayTasksChange: (value: boolean) => void
  onExpandAllBeforePrintChange: (value: boolean) => void
  onToggleManualTask: (taskId: Uuid) => void
  onConfirm: () => void
}

export function PrintConfigModal({
  isOpen,
  draft,
  taskOptions,
  onClose,
  onSelectionModeChange,
  onIncludeOneDayTasksChange,
  onExpandAllBeforePrintChange,
  onToggleManualTask,
  onConfirm,
}: PrintConfigModalProps) {
  if (!isOpen) {
    return null
  }

  const manualSelection = new Set(draft.manualTaskIds)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Configuración de impresión">
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Configuración de impresión</h2>
        <p className="mt-1 text-sm text-gray-600">Definí qué tareas proyectar antes de abrir la vista /print.</p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-gray-900">Alcance</legend>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="selection-mode"
              checked={draft.selectionMode === 'visible'}
              onChange={() => onSelectionModeChange('visible')}
            />
            Imprimir tareas visibles
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="selection-mode"
              checked={draft.selectionMode === 'manual'}
              onChange={() => onSelectionModeChange('manual')}
            />
            Selección manual
          </label>
        </fieldset>

        <div className="mt-4 grid gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.includeOneDayTasks}
              onChange={(event) => onIncludeOneDayTasksChange(event.target.checked)}
            />
            Incluir tareas de 1 día
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.expandAllBeforePrint}
              onChange={(event) => onExpandAllBeforePrintChange(event.target.checked)}
            />
            Expandir todo antes de imprimir
          </label>
        </div>

        {draft.selectionMode === 'manual' ? (
          <div className="mt-4 rounded border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-900">Tareas a incluir</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {taskOptions.map((task) => (
                <li key={task.id}>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={manualSelection.has(task.id)}
                      onChange={() => onToggleManualTask(task.id)}
                    />
                    <span>{task.nombre} ({task.duracionDias}d)</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            Abrir vista de impresión
          </button>
        </div>
      </div>
    </div>
  )
}
