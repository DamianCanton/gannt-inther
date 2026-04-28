export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl p-8" role="status" aria-live="polite">
      <div className="mb-4 h-8 w-72 animate-pulse rounded bg-gray-200" />
      <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  )
}
