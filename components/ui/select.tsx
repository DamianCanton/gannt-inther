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
          className="text-[13px] font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-[13px] text-gray-900 shadow-xs',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
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
