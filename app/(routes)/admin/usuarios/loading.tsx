export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl p-8" role="status" aria-live="polite">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mb-8 h-4 w-96 animate-pulse rounded bg-gray-200" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      </div>

      <div className="mt-6 h-14 animate-pulse rounded-xl bg-gray-100" />
      <div className="mt-4 h-96 animate-pulse rounded-xl bg-gray-100" />
    </div>
  )
}
