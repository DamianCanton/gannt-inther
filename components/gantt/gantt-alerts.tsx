import type { GanttMutationError } from './gantt-types'

export interface GanttAlertsProps {
  cycleWarning: string | null
  saveError: GanttMutationError | null
  isMutating: boolean
  blockingError?: string | null
}

export function GanttAlerts({
  cycleWarning,
  saveError,
  isMutating,
  blockingError = null,
}: GanttAlertsProps) {
  if (blockingError) {
    return (
      <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {blockingError}
      </p>
    )
  }

  return (
    <>
      {cycleWarning ? (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          Dependencia circular detectada: {cycleWarning}
        </p>
      ) : null}

      {saveError ? (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {saveError.message}
        </p>
      ) : null}

      {isMutating ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded border border-accent/20 bg-accent/10 p-2 text-sm text-accent"
        >
          Guardando cambios en el cronograma...
        </p>
      ) : null}
    </>
  )
}
