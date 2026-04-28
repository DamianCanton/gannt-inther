export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-8" role="status" aria-live="polite">
      <div className="h-16 animate-pulse rounded-3xl bg-gray-200" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  )
}
