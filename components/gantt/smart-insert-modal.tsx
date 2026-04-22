'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

import type { SmartInsertStrategy } from './gantt-types'

export interface SmartInsertConflictInfo {
  parentName: string
  childName: string
}

export interface SmartInsertModalProps {
  /** Conflict details for the user message */
  conflict: SmartInsertConflictInfo
  /** Callback when user picks a strategy */
  onConfirm: (strategy: SmartInsertStrategy) => void
  /** Callback when user cancels */
  onCancel: () => void
  /** Disables buttons during async operations */
  isPending?: boolean
}

/**
 * Modal that presents the Insert vs Branch choice when a parent task
 * already has a dependent child.
 *
 * - Insert: linearizes the chain — A → N → B (removes A → B)
 * - Branch: keeps parallel — A → B and A → N
 */
export function SmartInsertModal({
  conflict,
  onConfirm,
  onCancel,
  isPending = false,
}: SmartInsertModalProps) {
  return (
    <Dialog
      open={true}
      onClose={onCancel}
      title="Conflicto de dependencia"
      className="max-w-[480px]"
    >
      <div className="space-y-5">
        {/* Explanation */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50/80">
            <svg
              className="h-4.5 w-4.5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="pt-1.5 text-[13px] leading-relaxed text-gray-500">
            La tarea <span className="font-medium text-gray-700">{conflict.parentName}</span>{' '}
            ya tiene como dependiente a{' '}
            <span className="font-medium text-gray-700">{conflict.childName}</span>.
            Elegí cómo insertar la nueva tarea:
          </p>
        </div>

        {/* Strategy cards */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onConfirm('insert')}
            disabled={isPending}
            className="group flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m10.5-3L13.5 18m0 0L9 13.5m4.5 4.5V4.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Insertar (encadenar)</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                {conflict.parentName} → Nueva tarea → {conflict.childName}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onConfirm('branch')}
            disabled={isPending}
            className="group flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3.5 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ramificar (paralelo)</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                {conflict.parentName} → {conflict.childName} y {conflict.parentName} → Nueva tarea
              </p>
            </div>
          </button>
        </div>

        {/* Cancel */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="text-[13px] text-gray-600 hover:bg-gray-100/80"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
