'use client'

import { Button } from '@/components/ui/button'

export interface DeleteObraDialogProps {
  /** Nombre de la obra que se va a eliminar */
  obraName: string
  /** Callback cuando el usuario confirma la eliminación */
  onConfirm: () => void
  /** Callback cuando el usuario cancela o cierra */
  onCancel: () => void
  /** Deshabilita botones durante la acción */
  isPending?: boolean
}

/**
 * Modal de confirmación para eliminación de obra.
 * Renderiza un backdrop + dialog nativo sin dependencias externas.
 * Toda la lógica de navegación/modal se delega al componente padre.
 */
export function DeleteObraDialog({
  obraName,
  onConfirm,
  onCancel,
  isPending = false,
}: DeleteObraDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className="mx-4 w-full max-w-[400px] rounded-xl bg-white border border-gray-200/80 shadow-xl animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50/80">
              <svg
                className="h-4.5 w-4.5 text-red-500"
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
            <h3
              id="delete-dialog-title"
              className="text-[15px] font-semibold text-gray-900 tracking-tight"
            >
              Confirmar eliminación
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-[13px] text-gray-500 leading-relaxed">
            ¿Estás seguro de que querés eliminar la obra{' '}
            <span className="font-medium text-gray-700">{obraName}</span>? Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-0 flex gap-2.5 justify-end">
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
          <Button
            type="button"
            size="sm"
            className="bg-red-600 text-white hover:bg-red-700 text-[13px] font-medium shadow-xs focus-visible:ring-red-500/30"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-3 w-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Eliminando...
              </span>
            ) : (
              'Eliminar'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
