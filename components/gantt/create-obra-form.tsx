'use client'

import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { ActionResponse } from '@/app/(routes)/obras/actions'

export interface CreateObraFormProps {
  /** Server Action que procesa la creación */
  action: (formData: FormData) => Promise<ActionResponse>
  /** Deshabilita el formulario durante otras mutaciones */
  disabled?: boolean
  /** Callback invocado tras creación exitosa (ej: cerrar modal, actualizar lista) */
  onSuccess?: () => void
}

/**
 * Formulario client-side para crear obras.
 * Usa la Server Action pasada por prop (no importa directamente).
 * Valida localmente antes de enviar y maneja errores del servidor.
 */
export function CreateObraForm({ action, disabled = false, onSuccess }: CreateObraFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const result = await action(formData)

    setIsPending(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        VALIDATION_ERROR: 'Revisá los datos obligatorios antes de guardar.',
        NO_PROJECT_MEMBERSHIP: 'No tenés membresía activa para gestionar obras.',
        EMPTY_TEMPLATE: 'No hay plantilla publicada para este tipo de obra. Creá una desde Gestión de Plantillas.',
        ATOMIC_WRITE_FAILED: 'No se pudo completar la operación. Intentá nuevamente.',
        UNAUTHENTICATED: 'Debés iniciar sesión para continuar.',
      }
      setError(messages[result.error ?? ''] ?? 'Ocurrió un error inesperado al procesar la operación.')
      return
    }

    // Reset form on success
    formRef.current?.reset()
    onSuccess?.()
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200/80 bg-white p-5 shadow-xs"
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-200/80 bg-red-50/50 px-4 py-3 text-[13px] text-red-700 flex items-start gap-2.5">
          <svg
            className="h-4 w-4 text-red-400 mt-0.5 shrink-0"
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
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          name="nombre"
          label="Nombre de la obra"
          placeholder="Ej: Edificio Torres del Lago"
          required
          disabled={isPending || disabled}
          className="border-gray-200/80 bg-white shadow-xs text-[13px] focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
        <Input
          name="fechaInicioGlobal"
          label="Fecha de inicio"
          type="date"
          required
          disabled={isPending || disabled}
          className="border-gray-200/80 bg-white shadow-xs text-[13px] focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
        <Input
          name="cliente"
          label="Cliente"
          placeholder="Opcional"
          disabled={isPending || disabled}
          className="border-gray-200/80 bg-white shadow-xs text-[13px] focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
        <Select
          name="tipoObra"
          label="Tipo de obra"
          defaultValue="Tipo A"
          disabled={isPending || disabled}
        >
          <option value="Tipo A">Tipo A</option>
          <option value="Tipo B">Tipo B</option>
          <option value="Tipo C">Tipo C</option>
        </Select>
        <Input
          name="vigenciaTexto"
          label="Vigencia"
          placeholder="Opcional"
          className="md:col-span-2 border-gray-200/80 bg-white shadow-xs text-[13px] focus-visible:ring-primary/30 focus-visible:border-primary/50"
          disabled={isPending || disabled}
        />
        <Button
          type="submit"
          className="md:col-span-2 bg-primary text-white hover:bg-primary/90 shadow-xs text-[13px] font-medium rounded-lg transition-colors focus-visible:ring-primary/30"
          disabled={isPending || disabled}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-3.5 w-3.5 animate-spin"
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
              Creando...
            </span>
          ) : (
            'Crear obra'
          )}
        </Button>
      </div>
    </form>
  )
}
