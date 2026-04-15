/**
 * Loading boundary para /obras.
 * Skeleton loader mientras el Server Component obtiene datos.
 */
export default function ObrasLoading() {
  return (
    <div className="p-8 space-y-6">
      {/* Title skeleton */}
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />

      {/* Create form skeleton */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded border border-gray-200 bg-gray-100"
            />
          ))}
          <div className="h-10 animate-pulse rounded bg-blue-100 md:col-span-2" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
              <div className="h-5 w-20 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-gray-100" />
            <div className="mt-6 h-10 w-full animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
