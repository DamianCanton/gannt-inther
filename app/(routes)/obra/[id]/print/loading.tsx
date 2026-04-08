export default function LoadingPrintPage() {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-4 p-8" role="status">
      <p className="text-sm text-gray-600">Preparando vista de impresión…</p>
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="h-96 animate-pulse rounded border border-gray-200 bg-gray-100" />
    </div>
  )
}
