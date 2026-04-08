export default function LoadingObraGantt() {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-4 p-8" role="status">
      <p className="text-sm text-gray-600">Cargando cronograma de la obra…</p>
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="h-96 animate-pulse rounded border border-gray-200 bg-gray-100" />
        <div className="h-96 animate-pulse rounded border border-gray-200 bg-gray-100" />
      </div>
    </div>
  )
}
