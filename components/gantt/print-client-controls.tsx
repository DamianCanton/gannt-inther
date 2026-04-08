'use client'

import { useEffect, useRef, useState } from 'react'

export interface PrintClientControlsProps {
  readySelector?: string
  autoPrintTimeoutMs?: number
}

const DEFAULT_READY_SELECTOR = '.print-gantt-table'
const DEFAULT_AUTO_PRINT_TIMEOUT_MS = 1500

export function PrintClientControls({
  readySelector = DEFAULT_READY_SELECTOR,
  autoPrintTimeoutMs = DEFAULT_AUTO_PRINT_TIMEOUT_MS,
}: PrintClientControlsProps) {
  const [didAutoPrint, setDidAutoPrint] = useState(false)
  const [showManualFallback, setShowManualFallback] = useState(false)
  const hasTriggeredPrint = useRef(false)

  useEffect(() => {
    if (hasTriggeredPrint.current || typeof window === 'undefined') {
      return
    }

    const timerId = window.setTimeout(() => {
      if (!hasTriggeredPrint.current) {
        setShowManualFallback(true)
      }
    }, autoPrintTimeoutMs)

    const tryPrint = () => {
      const ready = document.querySelector(readySelector)
      if (!ready || hasTriggeredPrint.current) {
        return false
      }

      hasTriggeredPrint.current = true
      window.print()
      setDidAutoPrint(true)
      return true
    }

    if (!tryPrint()) {
      const rafId = window.requestAnimationFrame(() => {
        tryPrint()
      })

      return () => {
        window.cancelAnimationFrame(rafId)
        window.clearTimeout(timerId)
      }
    }

    return () => {
      window.clearTimeout(timerId)
    }
  }, [autoPrintTimeoutMs, readySelector])

  const statusText = didAutoPrint
    ? 'Abrimos el diálogo de impresión automáticamente.'
    : 'Preparando impresión…'

  return (
    <div className="no-print mb-4 flex items-center justify-between gap-3 rounded border border-gray-200 bg-white p-3 text-sm text-gray-700">
      <p>{statusText}</p>
      {showManualFallback ? (
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          Imprimir ahora
        </button>
      ) : null}
    </div>
  )
}
