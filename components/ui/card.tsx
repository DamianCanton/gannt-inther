import React from 'react'

/**
 * Simple className utility for merging classes
 */
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-sm p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
