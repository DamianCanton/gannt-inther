'use client'

import { Button } from '@/components/ui/button'
import { ToastOnMount } from '@/components/ui/toast-on-mount'

/**
 * Error boundary para /obras.
 * Captura errores de fetch o render del Server Component.
 * Muestra mensaje recuperable con retry.
 */
export default function ObrasError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-8">
      <ToastOnMount
        variant="error"
        title="No se pudieron cargar las obras"
        description={error.message}
      />
      <h1 className="text-[18px] font-semibold tracking-tight mb-6">Obras</h1>
      <div className="rounded border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">
          No se pudieron cargar las obras
        </h2>
        <p className="mt-2 text-sm text-red-700">
          Ocurrió un error al obtener los datos del servidor. Esto puede ser
          temporal — intentá nuevamente.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-red-600">
            Detalles técnicos
          </summary>
          <pre className="mt-1 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        </details>
        <Button onClick={reset} className="mt-4">
          Reintentar
        </Button>
      </div>
    </div>
  )
}
