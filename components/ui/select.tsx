import React, { useId } from 'react'

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  /** Clases adicionales para el div wrapper (ej: md:col-span-2 para layouts de grilla) */
  wrapperClassName?: string
}

export function Select({
  label,
  wrapperClassName,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = props.id ?? generatedId

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[12px] font-medium uppercase tracking-wider text-gray-500"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
