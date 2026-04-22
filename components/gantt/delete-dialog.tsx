'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

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
 * Compone sobre el componente Dialog existente para reutilizar
 * backdrop, Escape, scroll-lock y animaciones.
 */
export function DeleteObraDialog({
  obraName,
  onConfirm,
  onCancel,
  isPending = false,
}: DeleteObraDialogProps) {
  return (
    <Dialog
      open={true}
      onClose={onCancel}
      title="Confirmar eliminación"
      className="max-w-[400px]"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50/80">
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
          <p className="text-[13px] text-gray-500 leading-relaxed pt-1.5">
            ¿Estás seguro de que querés eliminar la obra{' '}
            <span className="font-medium text-gray-700">{obraName}</span>? Esta
            acción no se puede deshacer.
          </p>
        </div>

        <div className="flex gap-2.5 justify-end">
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
    </Dialog>
  )
}
