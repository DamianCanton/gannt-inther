'use client'

import { useEffect } from 'react'

export default function ObraError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="space-y-4 bg-slate-50/70 p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Error cargando la obra</h1>
      <p className="text-sm text-red-600">{error.message}</p>
      <button className="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent/90" onClick={reset} type="button">
        Reintentar
      </button>
    </div>
  )
}
