'use client'

import { useRef, useState } from 'react'
import { CalendarDays, Building2, FilePlus2, FolderKanban, UserRound } from 'lucide-react'

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
      className="space-y-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(8,30,68,0.035),rgba(246,147,35,0.08))] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_14px_30px_-18px_rgba(246,147,35,0.95)]">
            <FilePlus2 className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="space-y-1">
            <p className="text-[18px] font-semibold tracking-tight text-slate-900">
              Crear diagrama nuevo
            </p>
            <p className="text-[14px] leading-6 text-slate-500">
              Definí la obra base, su fecha de inicio y el tipo de cronograma para empezar.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-[13px] text-red-700 flex items-start gap-2.5">
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
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700" htmlFor="obra-nombre">
            <Building2 className="h-4 w-4 text-slate-400" strokeWidth={2} />
            Nombre de la obra
          </label>
          <Input
            id="obra-nombre"
            name="nombre"
            placeholder="Ej: Edificio Torres del Lago"
            required
            disabled={isPending || disabled}
            className="h-12 rounded-xl border-slate-200 bg-white text-[14px] shadow-sm focus-visible:border-accent focus-visible:ring-accent/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700" htmlFor="obra-fecha-inicio">
            <CalendarDays className="h-4 w-4 text-slate-400" strokeWidth={2} />
            Fecha de inicio
          </label>
          <Input
            id="obra-fecha-inicio"
            name="fechaInicioGlobal"
            type="date"
            required
            disabled={isPending || disabled}
            className="h-12 rounded-xl border-slate-200 bg-white text-[14px] shadow-sm focus-visible:border-accent focus-visible:ring-accent/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700" htmlFor="obra-cliente">
            <UserRound className="h-4 w-4 text-slate-400" strokeWidth={2} />
            Cliente
          </label>
          <Input
            id="obra-cliente"
            name="cliente"
            placeholder="Opcional"
            disabled={isPending || disabled}
            className="h-12 rounded-xl border-slate-200 bg-white text-[14px] shadow-sm focus-visible:border-accent focus-visible:ring-accent/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700" htmlFor="obra-tipo">
            <FolderKanban className="h-4 w-4 text-slate-400" strokeWidth={2} />
            Tipo de obra
          </label>
          <Select
            id="obra-tipo"
            name="tipoObra"
            defaultValue="Tipo A"
            disabled={isPending || disabled}
            className="h-12 rounded-xl border-slate-200 bg-white text-[14px] shadow-sm focus-visible:border-accent focus-visible:ring-accent/40"
          >
            <option value="Tipo A">Tipo A</option>
            <option value="Tipo B">Tipo B</option>
            <option value="Tipo C">Tipo C</option>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[13px] font-medium text-slate-700" htmlFor="obra-vigencia">
            Vigencia
          </label>
          <Input
            id="obra-vigencia"
            name="vigenciaTexto"
            placeholder="Opcional"
            className="h-12 rounded-xl border-slate-200 bg-white text-[14px] shadow-sm focus-visible:border-accent focus-visible:ring-accent/40"
            disabled={isPending || disabled}
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <Button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-medium text-white shadow-[0_10px_24px_-14px_rgba(246,147,35,1)] transition-colors hover:bg-accent/90 focus-visible:ring-accent/40"
          disabled={isPending || disabled}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
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
            'Crear diagrama nuevo'
          )}
        </Button>
        </div>
      </div>
    </form>
  )
}
