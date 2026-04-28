import React, { useId } from 'react'

/**
 * Simple className utility for merging classes
 */
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({ label, error, helperText, className, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = props.id ?? generatedId

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-[12px] font-medium uppercase tracking-wider text-gray-500">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'rounded-lg border bg-white px-3 py-2.5 text-[13px] text-gray-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent',
          error ? 'border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500' : 'border-gray-200',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
      {!error && helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </div>
  )
}
