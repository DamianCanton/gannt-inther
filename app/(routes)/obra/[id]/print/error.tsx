'use client'

interface PrintRouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PrintRouteError({ reset }: PrintRouteErrorProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-bold">No pudimos abrir la vista de impresión</h1>
      <p className="text-sm text-gray-700">
        Intentá nuevamente. Si el problema continúa, volvé a la obra y reintentá exportar.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reintentar
        </button>
        <a
          href="/obras"
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver a obras
        </a>
      </div>
    </div>
  )
}
