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
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
          error ? 'border-red-500' : 'border-gray-300',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-red-500 text-sm">{error}</span>
      )}
      {!error && helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </div>
  )
}
