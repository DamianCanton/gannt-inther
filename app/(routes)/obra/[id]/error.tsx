'use client'

import { useEffect } from 'react'

export default function ObraError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="space-y-4 p-8">
      <h1 className="text-2xl font-bold">Error cargando la obra</h1>
      <p className="text-sm text-red-600">{error.message}</p>
      <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={reset} type="button">
        Reintentar
      </button>
    </div>
  )
}
