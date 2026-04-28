'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'error' | 'info'

type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastItem = ToastInput & {
  id: string
}

type ToastContextValue = {
  toast: (toast: ToastInput) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function getToastStyles(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-900'
    default:
      return 'border-slate-200 bg-white text-slate-900'
  }
}

function getToastIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-600" />
    default:
      return <Info className="h-4 w-4 text-slate-600" />
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutsRef = useRef(new Map<string, number>())
  const lastToastRef = useRef<{ signature: string; timestamp: number } | null>(null)

  const dismiss = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutsRef.current.delete(id)
    }

    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 4500 }: ToastInput) => {
      const signature = `${variant}:${title}:${description ?? ''}`
      const now = Date.now()
      if (lastToastRef.current && lastToastRef.current.signature === signature && now - lastToastRef.current.timestamp < 1000) {
        return lastToastRef.current.signature
      }

      lastToastRef.current = { signature, timestamp: now }
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, title, description, variant, duration }])

      const timeoutId = window.setTimeout(() => {
        dismiss(id)
      }, duration)
      timeoutsRef.current.set(id, timeoutId)

      return id
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeoutsRef.current.clear()
    }
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/10 ${getToastStyles(item.variant ?? 'default')}`}
            role={item.variant === 'error' ? 'alert' : 'status'}
          >
            <div className="mt-0.5">{getToastIcon(item.variant ?? 'default')}</div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-semibold leading-5">{item.title}</p>
              {item.description ? <p className="text-sm leading-5 text-slate-600">{item.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-800"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context) {
    return context
  }

  return {
    toast: () => '',
    dismiss: () => {},
  }
}
